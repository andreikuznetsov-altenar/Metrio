import type { Person } from "../people/types";
import {
  buildOrgGraph,
  employeeHasDirectReports,
  type OrgNode,
} from "../organization/orgGraph";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import type { WorkloadRow } from "../performance";
import { capacityLevelFromPercent } from "../workflows/capacityWorkload";
import { workloadDisplayLabel } from "./workloadDisplay";

export type WorkloadUnitKind = "personal" | "team";

export type TeamWorkloadViewContext =
  | { mode: "own_team" }
  | {
      mode: "manager_units";
      orgGraph: Map<string, OrgNode>;
    };

function resolvePersonalWorkload(person: Person | undefined): Person["workload"] {
  if (!person) return null;
  return person.personalWorkload ?? person.workload;
}

export interface CurrentEffortMeasure {
  expectedEffortHours: number;
  availableHoursInHorizon: number;
}

export function personalCurrentEffort(person: Person | undefined): CurrentEffortMeasure | null {
  const workload = resolvePersonalWorkload(person);
  const expected = workload?.expectedEffortHours;
  const available = workload?.availableHoursInHorizon;
  if (
    expected == null ||
    available == null ||
    !Number.isFinite(expected) ||
    !Number.isFinite(available)
  ) {
    return null;
  }
  return {
    expectedEffortHours: Math.max(0, expected),
    availableHoursInHorizon: Math.max(0, available),
  };
}

function percentFor(measure: CurrentEffortMeasure | null): number | null {
  if (!measure || measure.availableHoursInHorizon <= 0) return null;
  return (measure.expectedEffortHours / measure.availableHoursInHorizon) * 100;
}

/**
 * Bottom-up organizational effort totals. Child units contribute their full numerator and
 * denominator, so a one-person team and a ten-person team never receive equal weight.
 */
export function computeOrganizationalTeamEffort(
  managerId: string,
  orgGraph: Map<string, OrgNode>,
  personalEffort: (personId: string) => CurrentEffortMeasure | null,
  visiting: Set<string> = new Set(),
): CurrentEffortMeasure | null {
  if (visiting.has(managerId)) return null;
  visiting.add(managerId);

  const node = orgGraph.get(managerId);
  if (!node) {
    visiting.delete(managerId);
    return personalEffort(managerId);
  }

  const unitValues: CurrentEffortMeasure[] = [];
  const self = personalEffort(managerId);
  if (self) unitValues.push(self);

  for (const reportId of node.directReportIds) {
    if (employeeHasDirectReports(reportId, orgGraph)) {
      const childTeam = computeOrganizationalTeamEffort(
        reportId,
        orgGraph,
        personalEffort,
        visiting,
      );
      if (childTeam) unitValues.push(childTeam);
    } else {
      const personal = personalEffort(reportId);
      if (personal) unitValues.push(personal);
    }
  }

  visiting.delete(managerId);
  if (!unitValues.length) return null;
  return unitValues.reduce(
    (total, unit) => ({
      expectedEffortHours: total.expectedEffortHours + unit.expectedEffortHours,
      availableHoursInHorizon:
        total.availableHoursInHorizon + unit.availableHoursInHorizon,
    }),
    { expectedEffortHours: 0, availableHoursInHorizon: 0 },
  );
}

export function computeOrganizationalTeamWorkload(
  managerId: string,
  orgGraph: Map<string, OrgNode>,
  personalEffort: (personId: string) => CurrentEffortMeasure | null,
): number | null {
  return percentFor(computeOrganizationalTeamEffort(managerId, orgGraph, personalEffort));
}

export function buildOrgGraphFromPersons(persons: Person[]): Map<string, OrgNode> {
  const employees: ResolvedEmployee[] = persons.map((person) => ({
    id: person.id,
    displayName: person.bamboo.displayName,
    firstName: person.bamboo.firstName,
    lastName: person.bamboo.lastName,
    workEmail: person.bamboo.workEmail,
    jobTitle: person.bamboo.jobTitle,
    department: person.bamboo.department,
    hireDate: person.bamboo.hireDate,
    supervisorId: person.bamboo.supervisorId,
    supervisorEmail: person.bamboo.supervisorEmail,
    status: person.bamboo.status,
  }));
  return buildOrgGraph(employees);
}

export interface ResolvedWorkloadUnit {
  personId: string;
  kind: WorkloadUnitKind;
  /** Current-queue workload level of the person (personal units); team units average capacity. */
  currentLevel?: string;
  loadPercent: number | null;
  activeWorkFallback: number;
  capacityDataState: WorkloadRow["capacityDataState"];
}

export function resolveWorkloadUnitForViewer(
  person: Person,
  context: TeamWorkloadViewContext,
  personalEffort: (id: string) => CurrentEffortMeasure | null,
): ResolvedWorkloadUnit {
  const personal = resolvePersonalWorkload(person);
  const activeFallback = personal?.activeCount ?? 0;
  const effort = personalEffort(person.id);
  const workloadState =
    effort && effort.availableHoursInHorizon > 0 ? "measured" : "insufficient_history";

  if (context.mode === "own_team") {
    return {
      personId: person.id,
      kind: "personal",
      currentLevel: personal?.level,
      loadPercent: percentFor(effort),
      activeWorkFallback: activeFallback,
      capacityDataState: workloadState,
    };
  }

  const isManagerUnit = employeeHasDirectReports(person.id, context.orgGraph);
  if (!isManagerUnit) {
    return {
      personId: person.id,
      kind: "personal",
      currentLevel: personal?.level,
      loadPercent: percentFor(effort),
      activeWorkFallback: activeFallback,
      capacityDataState: workloadState,
    };
  }

  const teamLoad = computeOrganizationalTeamWorkload(
    person.id,
    context.orgGraph,
    personalEffort,
  );

  return {
    personId: person.id,
    kind: "team",
    loadPercent: teamLoad,
    activeWorkFallback: activeFallback,
    capacityDataState: teamLoad != null ? "measured" : workloadState,
  };
}

export function workloadStatusLabelForUnit(unit: ResolvedWorkloadUnit): string {
  if (unit.kind === "personal" && unit.currentLevel) {
    return workloadDisplayLabel(unit.currentLevel);
  }
  if (unit.capacityDataState === "insufficient_history" || unit.loadPercent == null) {
    return "Workload unavailable";
  }
  return workloadDisplayLabel(capacityLevelFromPercent(unit.loadPercent));
}

export function workloadUnitDetailLabel(unit: ResolvedWorkloadUnit): string {
  const prefix = unit.kind === "team" ? "Team load" : "Personal load";
  if (unit.loadPercent != null && unit.capacityDataState === "measured") {
    return `${prefix} · ${Math.round(unit.loadPercent * 10) / 10}% current load`;
  }
  return `${prefix} · ${unit.activeWorkFallback} active`;
}

export function workloadUnitDonutWeight(unit: ResolvedWorkloadUnit): number {
  if (unit.loadPercent != null && unit.capacityDataState === "measured") {
    return Math.max(0, unit.loadPercent);
  }
  return Math.max(0, unit.activeWorkFallback);
}

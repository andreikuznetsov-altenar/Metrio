import type { Person } from "../people/types";
import {
  buildOrgGraph,
  employeeHasDirectReports,
  type OrgNode,
} from "../organization/orgGraph";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { capacityDataStateFromWorkload } from "./capacityPresentation";
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

export function personalCapacityLoadPercent(person: Person | undefined): number | null {
  if (!person?.workload) return null;
  const state = capacityDataStateFromWorkload(person.workload);
  if (state !== "measured") return null;
  const value = person.workload.capacityLoadPercent;
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function averageFinite(values: number[]): number | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (!finite.length) return null;
  return finite.reduce((sum, v) => sum + v, 0) / finite.length;
}

/**
 * Bottom-up organizational team workload for a manager's unit.
 * Leaf team: average(personal lead + personal ICs).
 * Nested: average(personal manager + each direct child unit value).
 */
export function computeOrganizationalTeamWorkload(
  managerId: string,
  orgGraph: Map<string, OrgNode>,
  personalPercent: (personId: string) => number | null,
  visiting: Set<string> = new Set(),
): number | null {
  if (visiting.has(managerId)) return null;
  visiting.add(managerId);

  const node = orgGraph.get(managerId);
  if (!node) {
    visiting.delete(managerId);
    return personalPercent(managerId);
  }

  const unitValues: number[] = [];
  const self = personalPercent(managerId);
  if (self != null) unitValues.push(self);

  for (const reportId of node.directReportIds) {
    if (employeeHasDirectReports(reportId, orgGraph)) {
      const childTeam = computeOrganizationalTeamWorkload(
        reportId,
        orgGraph,
        personalPercent,
        visiting,
      );
      if (childTeam != null) unitValues.push(childTeam);
    } else {
      const personal = personalPercent(reportId);
      if (personal != null) unitValues.push(personal);
    }
  }

  visiting.delete(managerId);
  return averageFinite(unitValues);
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
  loadPercent: number | null;
  activeWorkFallback: number;
  capacityDataState: WorkloadRow["capacityDataState"];
}

export function resolveWorkloadUnitForViewer(
  person: Person,
  context: TeamWorkloadViewContext,
  personalPercent: (id: string) => number | null,
): ResolvedWorkloadUnit {
  const activeFallback = person.workload?.activeCount ?? 0;
  const capacityState = capacityDataStateFromWorkload(person.workload ?? null);

  if (context.mode === "own_team") {
    return {
      personId: person.id,
      kind: "personal",
      loadPercent: personalPercent(person.id),
      activeWorkFallback: activeFallback,
      capacityDataState: capacityState,
    };
  }

  const isManagerUnit = employeeHasDirectReports(person.id, context.orgGraph);
  if (!isManagerUnit) {
    return {
      personId: person.id,
      kind: "personal",
      loadPercent: personalPercent(person.id),
      activeWorkFallback: activeFallback,
      capacityDataState: capacityState,
    };
  }

  const teamLoad = computeOrganizationalTeamWorkload(
    person.id,
    context.orgGraph,
    personalPercent,
  );

  return {
    personId: person.id,
    kind: "team",
    loadPercent: teamLoad,
    activeWorkFallback: activeFallback,
    capacityDataState: teamLoad != null ? "measured" : capacityState,
  };
}

export function workloadStatusLabelForUnit(unit: ResolvedWorkloadUnit): string {
  if (unit.capacityDataState === "insufficient_history" || unit.loadPercent == null) {
    return "Not enough history";
  }
  return workloadDisplayLabel(capacityLevelFromPercent(unit.loadPercent));
}

export function workloadUnitDetailLabel(unit: ResolvedWorkloadUnit): string {
  const prefix = unit.kind === "team" ? "Team load" : "Personal load";
  if (unit.loadPercent != null && unit.capacityDataState === "measured") {
    return `${prefix} · ${Math.round(unit.loadPercent * 10) / 10}% capacity`;
  }
  return `${prefix} · ${unit.activeWorkFallback} active`;
}

export function workloadUnitDonutWeight(unit: ResolvedWorkloadUnit): number {
  if (unit.loadPercent != null && unit.capacityDataState === "measured") {
    return Math.max(0, unit.loadPercent);
  }
  return Math.max(0, unit.activeWorkFallback);
}

import type { Person } from "../people/types";
import {
  buildOrgGraph,
  employeeHasDirectReports,
  type OrgNode,
} from "../organization/orgGraph";
import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { capacityLevelFromPercent } from "../workflows/capacityWorkload";
import { workloadDisplayLabel } from "./workloadDisplay";
import { WORKLOAD_UNAVAILABLE_LABEL } from "./capacityPresentation";

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

export function addCurrentEffort(
  a: CurrentEffortMeasure,
  b: CurrentEffortMeasure,
): CurrentEffortMeasure {
  return {
    expectedEffortHours: a.expectedEffortHours + b.expectedEffortHours,
    availableHoursInHorizon: a.availableHoursInHorizon + b.availableHoursInHorizon,
  };
}

/**
 * Current workload of a set of people: Σ expectedEffortHours / Σ availableHoursInHorizon.
 * Each person is counted once, so how the set is grouped (flat, by team, by nested branches)
 * can never change the result. Percentages are never averaged.
 */
export function aggregateCurrentEffort(
  personIds: Iterable<string>,
  personalEffort: (personId: string) => CurrentEffortMeasure | null,
): CurrentEffortMeasure | null {
  const seen = new Set<string>();
  let total: CurrentEffortMeasure | null = null;
  for (const personId of personIds) {
    if (seen.has(personId)) continue;
    seen.add(personId);
    const effort = personalEffort(personId);
    if (!effort) continue;
    total = total ? addCurrentEffort(total, effort) : effort;
  }
  return total;
}

export function currentWorkloadPercent(measure: CurrentEffortMeasure | null): number | null {
  return percentFor(measure);
}

/** Every person in the manager's subtree (manager included), each exactly once. */
export function collectOrganizationalSubtreeIds(
  managerId: string,
  orgGraph: Map<string, OrgNode>,
): string[] {
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const reportId of orgGraph.get(id)?.directReportIds ?? []) visit(reportId);
  };
  visit(managerId);
  return [...seen];
}

/**
 * Organizational team effort: the manager's own effort plus every descendant's, summed as raw
 * numerators and denominators. Recursive grouping is irrelevant by construction — this is the
 * flat sum over the de-duplicated subtree, so a one-person team and a ten-person team are
 * weighted by their hours, and a person reachable twice is counted once.
 */
export function computeOrganizationalTeamEffort(
  managerId: string,
  orgGraph: Map<string, OrgNode>,
  personalEffort: (personId: string) => CurrentEffortMeasure | null,
): CurrentEffortMeasure | null {
  return aggregateCurrentEffort(
    collectOrganizationalSubtreeIds(managerId, orgGraph),
    personalEffort,
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
  /** Current-queue workload level of the person (personal units). Team units derive it from loadPercent. */
  currentLevel?: string;
  /** Current workload %: Σ expected effort / Σ available hours in the horizon. */
  loadPercent: number | null;
  /** Task count shown only when Current workload cannot be computed at all. */
  activeWorkFallback: number;
  /** Availability of Current workload only. Completed-work history is never consulted. */
  currentState: "measured" | "unavailable";
}

export function resolveWorkloadUnitForViewer(
  person: Person,
  context: TeamWorkloadViewContext,
  personalEffort: (id: string) => CurrentEffortMeasure | null,
): ResolvedWorkloadUnit {
  const personal = resolvePersonalWorkload(person);
  const activeFallback = personal?.activeCount ?? 0;
  const effort = personalEffort(person.id);
  const workloadState: ResolvedWorkloadUnit["currentState"] =
    effort && effort.availableHoursInHorizon > 0 ? "measured" : "unavailable";

  if (context.mode === "own_team") {
    return {
      personId: person.id,
      kind: "personal",
      currentLevel: personal?.level,
      loadPercent: percentFor(effort),
      activeWorkFallback: activeFallback,
      currentState: workloadState,
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
      currentState: workloadState,
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
    currentState: teamLoad != null ? "measured" : workloadState,
  };
}

export function workloadStatusLabelForUnit(unit: ResolvedWorkloadUnit): string {
  if (unit.kind === "personal" && unit.currentLevel) {
    return workloadDisplayLabel(unit.currentLevel);
  }
  if (unit.currentState === "unavailable" || unit.loadPercent == null) {
    return WORKLOAD_UNAVAILABLE_LABEL;
  }
  return workloadDisplayLabel(capacityLevelFromPercent(unit.loadPercent));
}

export function workloadUnitDetailLabel(unit: ResolvedWorkloadUnit): string {
  const prefix = unit.kind === "team" ? "Team load" : "Personal load";
  if (unit.loadPercent != null) {
    return `${prefix} · ${Math.round(unit.loadPercent * 10) / 10}% current load`;
  }
  return `${prefix} · ${unit.activeWorkFallback} active`;
}

export function workloadUnitDonutWeight(unit: ResolvedWorkloadUnit): number {
  if (unit.loadPercent != null) {
    return Math.max(0, unit.loadPercent);
  }
  return Math.max(0, unit.activeWorkFallback);
}

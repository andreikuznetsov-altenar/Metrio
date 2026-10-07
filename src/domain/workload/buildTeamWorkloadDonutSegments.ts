import type { WorkloadRow } from "../performance";

export interface TeamWorkloadDonutSegment {
  personId: string;
  personName: string;
  weight: number;
  workloadLabel: string;
  detailLabel: string;
}

/** Share of team measured load uses the same capacity % as Team Workload when available. */
export function workloadDonutWeight(row: WorkloadRow): number {
  if (row.capacityDataState === "measured" && row.capacityLoadPercent != null) {
    return Math.max(0, row.capacityLoadPercent);
  }
  return Math.max(0, row.activeWork);
}

export function workloadDonutDetailLabel(row: WorkloadRow): string {
  if (row.capacityDataState === "measured" && row.capacityLoadPercent != null) {
    return `${row.capacityLoadPercent}% capacity`;
  }
  return `${row.activeWork} active`;
}

export function buildTeamWorkloadDonutSegments(
  workload: WorkloadRow[],
): TeamWorkloadDonutSegment[] {
  return workload.map((row) => ({
    personId: row.personId,
    personName: row.personName ?? row.personId,
    weight: workloadDonutWeight(row),
    workloadLabel: row.workload,
    detailLabel: workloadDonutDetailLabel(row),
  }));
}

export function workloadDonutSupportingMetric(row: WorkloadRow): string {
  if (row.capacityDataState === "insufficient_history") {
    return "Not enough history";
  }
  return `${row.activeWork} active · ${row.atRisk} at risk`;
}

export function teamWorkloadDonutMetricLabel(workload: WorkloadRow[]): string {
  const measured = workload.some(
    (row) => row.capacityDataState === "measured" && row.capacityLoadPercent != null,
  );
  return measured
    ? "Share of estimated monthly capacity load"
    : "Share of active work (insufficient capacity history)";
}

/** Distinct segment colors — stable per person, theme-aware via tokens. */
export const TEAM_WORKLOAD_DONUT_COLORS = [
  "var(--team-donut-color-1)",
  "var(--team-donut-color-2)",
  "var(--team-donut-color-3)",
  "var(--team-donut-color-4)",
  "var(--team-donut-color-5)",
  "var(--team-donut-color-6)",
  "var(--team-donut-color-7)",
  "var(--team-donut-color-8)",
] as const;

function hashPersonId(personId: string): number {
  let hash = 0;
  for (let i = 0; i < personId.length; i += 1) {
    hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function teamWorkloadDonutColorForPerson(
  personId: string,
  usedIndices: Set<number> = new Set(),
): string {
  const palette = TEAM_WORKLOAD_DONUT_COLORS;
  let index = hashPersonId(personId) % palette.length;
  let guard = 0;
  while (usedIndices.has(index) && guard < palette.length) {
    index = (index + 1) % palette.length;
    guard += 1;
  }
  usedIndices.add(index);
  return palette[index];
}

/** Largest workload share wins; ties use canonical team workload row order. */
export function selectDefaultTeamWorkloadDonutPersonId(
  workload: WorkloadRow[],
): string | null {
  if (!workload.length) return null;
  let bestId: string | null = null;
  let bestWeight = -1;
  let bestOrder = Number.POSITIVE_INFINITY;
  workload.forEach((row, order) => {
    const weight = workloadDonutWeight(row);
    if (weight > bestWeight || (weight === bestWeight && order < bestOrder)) {
      bestWeight = weight;
      bestOrder = order;
      bestId = row.personId;
    }
  });
  return bestId;
}

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

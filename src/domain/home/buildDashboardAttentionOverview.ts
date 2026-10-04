import type { HomeDeliverySummary } from "./homeTypes";
import type { WorkloadRow } from "../performance";

export interface DashboardAttentionStat {
  id: string;
  label: string;
  value: number;
  tone: "critical" | "warning" | "neutral";
}

function countOverloaded(workload: WorkloadRow[]): number {
  return workload.filter((row) => /high|overload/i.test(row.workload)).length;
}

export function buildDashboardAttentionOverview(input: {
  deliverySummary: HomeDeliverySummary;
  workload: WorkloadRow[];
}): DashboardAttentionStat[] {
  const overloaded = countOverloaded(input.workload);
  const { problematic, longReview } = input.deliverySummary;

  return [
    {
      id: "long-review",
      label: "long Review",
      value: longReview,
      tone: longReview > 0 ? "warning" : "neutral",
    },
    {
      id: "overloaded",
      label: "overloaded",
      value: overloaded,
      tone: overloaded > 0 ? "warning" : "neutral",
    },
    {
      id: "problematic",
      label: "problematic",
      value: problematic,
      tone: problematic > 0 ? "critical" : "neutral",
    },
  ];
}

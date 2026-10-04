import type { BadgeVariant } from "../../components/Badge/Badge";
import type { MetricCardData, TeamPerformanceSnapshot, WorkloadRow } from "../performance";
import type { HomeDeliverySummary } from "./homeTypes";

export interface DashboardKpiCard {
  id: string;
  label: string;
  value: string;
  badge?: { label: string; variant: BadgeVariant };
  onOpen?: () => void;
}

function countOverloaded(workload: WorkloadRow[]): number {
  return workload.filter((row) => /high|overload/i.test(row.workload)).length;
}

function badgeForCount(count: number, healthyLabel: string): DashboardKpiCard["badge"] {
  if (count <= 0) {
    return { label: healthyLabel, variant: "neutral" };
  }
  return { label: "Needs attention", variant: "warning" };
}

/** KPI strip from existing Performance / home aggregates — no new formulas. */
export function buildManagerDashboardKpis(input: {
  deliveryRiskCount: number;
  deliverySummary: HomeDeliverySummary;
  teamSnapshot: TeamPerformanceSnapshot | null;
  awayNextWeek: number;
}): DashboardKpiCard[] {
  const overloaded = input.teamSnapshot
    ? countOverloaded(input.teamSnapshot.workload)
    : 0;
  const { longReview } = input.deliverySummary;

  return [
    {
      id: "delivery-risk",
      label: "Delivery risk",
      value: String(input.deliveryRiskCount),
      badge: badgeForCount(input.deliveryRiskCount, "Clear"),
    },
    {
      id: "long-review",
      label: "Long Review",
      value: String(longReview),
      badge: badgeForCount(longReview, "On track"),
    },
    {
      id: "overloaded",
      label: "Overloaded people",
      value: String(overloaded),
      badge: badgeForCount(overloaded, "Balanced"),
    },
    {
      id: "leave",
      label: "Upcoming leave",
      value: String(input.awayNextWeek),
      badge:
        input.awayNextWeek > 0
          ? { label: "Coverage", variant: "neutral" }
          : { label: "Available", variant: "success" },
    },
  ];
}

export function buildEmployeeDashboardKpis(
  metrics: Pick<MetricCardData, "label" | "value">[],
): DashboardKpiCard[] {
  return metrics.slice(0, 4).map((metric, index) => ({
    id: `metric-${index}`,
    label: metric.label,
    value: metric.value,
  }));
}

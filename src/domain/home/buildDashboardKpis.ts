import type { BadgeVariant } from "../../components/Badge/Badge";
import type { MetricCardData, WorkloadRow } from "../performance";
import type { WorkloadResult } from "../workload/workloadEngine";
import type { PersonAvailability } from "../people/types";
import {
  employeeCapacityKpi,
  teamCapacityKpiFromRows,
} from "../workload/capacityPresentation";
import type { ScopeHealthSummary } from "./executiveDashboardModel";

export interface DashboardKpiCard {
  id: string;
  label: string;
  value: string;
  badge?: { label: string; variant: BadgeVariant };
  tooltip?: string;
  onOpen?: () => void;
}

function badgeForCount(count: number, healthyLabel: string): DashboardKpiCard["badge"] {
  if (count <= 0) {
    return { label: healthyLabel, variant: "neutral" };
  }
  return { label: "Needs attention", variant: "warning" };
}

function scopeBadge(scopeHealth: ScopeHealthSummary): DashboardKpiCard["badge"] {
  if (scopeHealth.severity === "healthy") {
    return { label: "Healthy", variant: "success" };
  }
  if (scopeHealth.severity === "watch") {
    return { label: "Watch", variant: "warning" };
  }
  return { label: "Critical", variant: "danger" };
}

function capacityKpiFromWorkload(workload: WorkloadRow[]): DashboardKpiCard {
  const summary = teamCapacityKpiFromRows(workload);
  return {
    id: "capacity",
    label: "Capacity",
    value: summary.value,
    badge: { label: summary.badgeLabel, variant: summary.badgeVariant },
    tooltip: summary.tooltip,
  };
}

/** Employee KPI strip — efficiency metrics plus workflow capacity load. */
export function buildEmployeeDashboardKpis(input: {
  metrics: Pick<MetricCardData, "label" | "value">[];
  workload: WorkloadResult | null;
  availability?: PersonAvailability;
}): DashboardKpiCard[] {
  const pick = ["Efficiency", "First pass", "Completed"] as const;
  const cards: DashboardKpiCard[] = pick.map((label) => {
    const metric = input.metrics.find((m) => m.label === label);
    return {
      id: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      value: metric?.value ?? "—",
    };
  });

  const capacity = employeeCapacityKpi({
    workload: input.workload,
    availability: input.availability,
  });

  cards.push({
    id: "capacity-load",
    label: "Capacity load",
    value: capacity.value,
    badge: { label: capacity.badgeLabel, variant: capacity.badgeVariant },
    tooltip: capacity.tooltip,
  });

  return cards;
}

/** Manager KPI strip from team health and delivery aggregates. */
export function buildManagerDashboardKpis(input: {
  scopeHealth: ScopeHealthSummary;
  firstPassRate: string;
  deliveryRiskCount: number;
  teamWorkload: WorkloadRow[];
}): DashboardKpiCard[] {
  return [
    {
      id: "team-health",
      label: "Team health",
      value: input.scopeHealth.line.split("·")[0]?.trim() ?? "—",
      badge: scopeBadge(input.scopeHealth),
      tooltip: input.scopeHealth.tooltip,
    },
    {
      id: "first-pass",
      label: "First pass",
      value: input.firstPassRate,
    },
    {
      id: "delivery-risk",
      label: "Delivery risk",
      value: String(input.deliveryRiskCount),
      badge: badgeForCount(input.deliveryRiskCount, "Clear"),
    },
    capacityKpiFromWorkload(input.teamWorkload),
  ];
}

/** Director KPI strip — organization-first signals. */
export function buildDirectorDashboardKpis(input: {
  scopeHealth: ScopeHealthSummary;
  teamsNeedingAttention: number;
  deliveryRiskCount: number;
  capacityImbalance: number;
}): DashboardKpiCard[] {
  return [
    {
      id: "organization-health",
      label: "Organization health",
      value: input.scopeHealth.severity === "healthy" ? "Steady" : "Elevated",
      badge: scopeBadge(input.scopeHealth),
      tooltip: input.scopeHealth.tooltip,
    },
    {
      id: "teams-attention",
      label: "Teams needing attention",
      value: String(input.teamsNeedingAttention),
      badge: badgeForCount(input.teamsNeedingAttention, "Clear"),
    },
    {
      id: "delivery-risk",
      label: "Delivery risk",
      value: String(input.deliveryRiskCount),
      badge: badgeForCount(input.deliveryRiskCount, "Clear"),
    },
    {
      id: "capacity-imbalance",
      label: "Capacity imbalance",
      value: String(input.capacityImbalance),
      badge: badgeForCount(input.capacityImbalance, "Balanced"),
      tooltip: "Gap between heavy/overloaded and light capacity levels across measured team members.",
    },
  ];
}

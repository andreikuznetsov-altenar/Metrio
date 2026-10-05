import type { BadgeVariant } from "../../components/Badge/Badge";
import type { MetricCardData, WorkloadRow } from "../performance";
import type { WorkloadResult } from "../workload/workloadEngine";
import { workloadDisplayLabel } from "../workload/workloadDisplay";
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

function countOverloaded(workload: WorkloadRow[]): number {
  return workload.filter((row) => row.workload === "Overloaded").length;
}

function capacityKpiFromWorkload(workload: WorkloadRow[]): DashboardKpiCard {
  const overloaded = countOverloaded(workload);
  const heavy = workload.filter((row) => row.workload === "Heavy").length;
  const hot = overloaded + heavy;
  return {
    id: "capacity",
    label: "Capacity",
    value: hot > 0 ? String(hot) : "0",
    badge: badgeForCount(hot, "Balanced"),
    tooltip: `${overloaded} overloaded · ${heavy} heavy across the team`,
  };
}

/** Employee KPI strip — efficiency metrics plus workflow capacity load. */
export function buildEmployeeDashboardKpis(input: {
  metrics: Pick<MetricCardData, "label" | "value">[];
  workload: WorkloadResult | null;
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

  const wl = input.workload;
  const percent =
    wl?.capacityLoadPercent ?? (typeof wl?.score === "number" ? wl.score : null);
  const levelLabel = wl ? workloadDisplayLabel(wl.level) : "Balanced";
  const active = wl?.activeWorkCount ?? wl?.activeCount ?? 0;
  const assigned = wl?.currentAssignedIssueCount ?? 0;

  cards.push({
    id: "capacity-load",
    label: "Capacity load",
    value: percent != null ? `${Math.round(percent)}%` : levelLabel,
    badge:
      levelLabel === "Overloaded"
        ? { label: "Overloaded", variant: "danger" }
        : levelLabel === "Heavy"
          ? { label: "Heavy", variant: "warning" }
          : { label: levelLabel, variant: "neutral" },
    tooltip: `${active} active work · ${assigned} assigned in Jira`,
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
      tooltip: "Gap between heavy/overloaded and light capacity levels across teams.",
    },
  ];
}

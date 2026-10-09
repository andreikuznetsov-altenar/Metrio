import type { BadgeVariant } from "../../components/Badge/Badge";
import type { MetricCardData, WorkloadRow } from "../performance";
import type { WorkloadResult } from "../workload/workloadEngine";
import type { PersonAvailability } from "../people/types";
import {
  employeeCapacityKpi,
  teamCapacityKpiFromRows,
} from "../workload/capacityPresentation";
import { getEfficiencyStatus } from "../jira/kpi";
import { performanceHelp } from "../performance/performanceHelp";
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

/** Map canonical efficiency status labels to KPI badge variants. */
export function efficiencyStatusBadge(
  status: string | undefined,
  statusVariant?: BadgeVariant,
): DashboardKpiCard["badge"] | undefined {
  if (!status) return undefined;
  if (statusVariant) {
    return { label: status, variant: statusVariant };
  }
  if (status === "Excellent" || status === "Healthy") {
    return { label: status, variant: "success" };
  }
  if (status === "Watch") {
    return { label: status, variant: "warning" };
  }
  return { label: status, variant: "danger" };
}

function parseEfficiencyPercent(value: string | undefined): number | null {
  if (!value || value === "—") return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (!match) return null;
  return Number(match[1]);
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

/**
 * Manager KPI strip.
 * TEAM HEALTH reuses the canonical team Efficiency metric (same source as Performance).
 * Delivery-risk counts stay on the Delivery risk card — never populate Team health.
 */
export function buildManagerDashboardKpis(input: {
  /** Canonical team Efficiency card from team performance summary. */
  teamEfficiency: Pick<MetricCardData, "value" | "status" | "statusVariant"> | null;
  firstPassRate: string;
  deliveryRiskCount: number;
  teamWorkload: WorkloadRow[];
}): DashboardKpiCard[] {
  const efficiencyValue = input.teamEfficiency?.value ?? "—";
  const score = parseEfficiencyPercent(efficiencyValue);
  const status =
    input.teamEfficiency?.status ??
    (score != null ? getEfficiencyStatus(score) : undefined);
  const badge = efficiencyStatusBadge(status, input.teamEfficiency?.statusVariant);

  // Packaged/runtime QA: localStorage.setItem("metrio-team-health-debug","1")
  if (typeof window !== "undefined" && window.localStorage?.getItem("metrio-team-health-debug") === "1") {
    const entry = {
      t: performance.now(),
      component: "buildManagerDashboardKpis",
      model: "ManagerExecutiveModel.kpis[team-health]",
      value: efficiencyValue,
      badge: badge?.label ?? null,
      sourceField: "teamSnapshot.summary[Efficiency] | performanceSnapshot.metrics[Efficiency]",
      deliveryRiskCountIgnored: input.deliveryRiskCount,
    };
    const bucket = (window as unknown as { __metrioTeamHealth?: unknown[] }).__metrioTeamHealth;
    if (Array.isArray(bucket)) bucket.push(entry);
    else (window as unknown as { __metrioTeamHealth: unknown[] }).__metrioTeamHealth = [entry];
  }

  return [
    {
      id: "team-health",
      label: "Team health",
      value: efficiencyValue,
      badge,
      tooltip: performanceHelp.efficiency,
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

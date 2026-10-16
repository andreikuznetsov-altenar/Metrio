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
    // Count of people whose CURRENT workload is Heavy or Overloaded (not scheduling capacity).
    label: "Heavy / Overloaded",
    value: summary.value,
    badge: { label: summary.badgeLabel, variant: summary.badgeVariant },
    tooltip: summary.tooltip,
  };
}

/** Employee KPI strip — transparent workflow outcomes plus Current workload. */
export function buildEmployeeDashboardKpis(input: {
  metrics: Pick<MetricCardData, "label" | "value">[];
  workload: WorkloadResult | null;
  availability?: PersonAvailability;
}): DashboardKpiCard[] {
  const pick = ["Throughput", "First Pass", "Completed"] as const;
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
    id: "current-workload",
    label: "Current workload",
    value: capacity.value,
    badge: { label: capacity.badgeLabel, variant: capacity.badgeVariant },
    tooltip: capacity.tooltip,
  });

  return cards;
}

/**
 * Compatibility-named selector for the canonical team Throughput card.
 */
export function resolveCanonicalTeamThroughputCard(
  summary: readonly Pick<MetricCardData, "label" | "value" | "status" | "statusVariant">[],
  fallbackThroughputValue?: string | null,
): Pick<MetricCardData, "label" | "value" | "status" | "statusVariant"> | null {
  const fromSummary = summary.find((metric) => metric.label === "Throughput");
  if (fromSummary?.value) {
    return fromSummary;
  }
  if (fallbackThroughputValue) {
    return { label: "Throughput", value: fallbackThroughputValue };
  }
  return null;
}

/** Display value for the tray team-throughput summary. */
export function canonicalTeamThroughputValue(
  summary: readonly Pick<MetricCardData, "label" | "value" | "status" | "statusVariant">[],
  fallbackThroughputValue?: string | null,
): string {
  return resolveCanonicalTeamThroughputCard(summary, fallbackThroughputValue)?.value ?? "—";
}

/**
 * Manager KPI strip.
 * Throughput is an outcome count, not a health score or a measure of individual performance.
 */
export function buildManagerDashboardKpis(input: {
  /** Canonical team Throughput card from team performance summary. */
  teamThroughput: Pick<MetricCardData, "value" | "status" | "statusVariant"> | null;
  firstPassRate: string;
  deliveryRiskCount: number;
  teamWorkload: WorkloadRow[];
}): DashboardKpiCard[] {
  const throughputValue = input.teamThroughput?.value ?? "—";
  const badge = input.teamThroughput?.status
    ? { label: input.teamThroughput.status, variant: input.teamThroughput.statusVariant ?? "neutral" }
    : undefined;

  // Packaged/runtime QA: localStorage.setItem("metrio-team-health-debug","1")
  if (typeof window !== "undefined" && window.localStorage?.getItem("metrio-team-health-debug") === "1") {
    const entry = {
      t: performance.now(),
      component: "buildManagerDashboardKpis",
      model: "ManagerExecutiveModel.kpis[team-health]",
      value: throughputValue,
      badge: badge?.label ?? null,
      sourceField: "teamSnapshot.summary[Throughput] | performanceSnapshot.metrics[Throughput]",
      deliveryRiskCountIgnored: input.deliveryRiskCount,
    };
    const bucket = (window as unknown as { __metrioTeamHealth?: unknown[] }).__metrioTeamHealth;
    if (Array.isArray(bucket)) bucket.push(entry);
    else (window as unknown as { __metrioTeamHealth: unknown[] }).__metrioTeamHealth = [entry];
  }

  return [
    {
      id: "throughput",
      label: "Throughput",
      value: throughputValue,
      badge,
      tooltip: "Successful completion cycles in the selected reporting period.",
    },
    {
      id: "first-pass",
      label: "First Pass",
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
      label: "Workload imbalance",
      value: String(input.capacityImbalance),
      badge: badgeForCount(input.capacityImbalance, "Balanced"),
      tooltip: "Gap between Heavy / Overloaded and Light people by Current workload.",
    },
  ];
}

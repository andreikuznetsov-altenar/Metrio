import type { HomeRoleVariant } from "./homeTypes";
import type { HomeDeliverySummary } from "./homeTypes";
import type { WorkloadRow } from "../performance";
import type { WorkloadResult } from "../workload/workloadEngine";
import {
  capacityPresentationLabel,
  CAPACITY_INSUFFICIENT_LABEL,
  capacityDataStateFromWorkload,
  isMeasuredCapacityLabel,
} from "../workload/capacityPresentation";
import {
  buildDirectorDashboardKpis,
  buildEmployeeDashboardKpis,
  buildManagerDashboardKpis,
  type DashboardKpiCard,
} from "./buildDashboardKpis";
import type { PersonAvailability } from "../people/types";
import type { ActionItem, ActionTarget } from "../actions/actionTypes";
import type { TrendCardData } from "../performance";
import {
  resolveAttentionViewTarget,
  scrollTargetIdForAction,
} from "./attentionNavigation";
import type { HomeOrganizationWorkspace } from "./homeTypes";
import type { HomePerformanceSnapshot } from "./homeTypes";

export type ScopeHealthSeverity = "healthy" | "watch" | "critical";

export interface ScopeHealthSummary {
  severity: ScopeHealthSeverity;
  line: string;
  tooltip: string;
}

export interface ExecutiveAttentionItem {
  id: string;
  title: string;
  detail?: string;
  severity: "critical" | "warning" | "neutral";
  issueKeys?: string[];
  viewTarget?: ActionTarget;
  scrollTargetId?: string | null;
}

export interface ExecutiveActionTab {
  id: string;
  label: string;
  items: ActionItem[];
  emptyMessage: string;
}

export interface ExecutiveDashboardShared {
  scopeLabel: "Employee" | "Team" | "Organization";
  scopeHealth: ScopeHealthSummary;
  kpis: DashboardKpiCard[];
  attentionItems: ExecutiveAttentionItem[];
  trendSpanClass: "executive-dashboard__span-8" | "executive-dashboard__span-12";
  trends: TrendCardData[];
  actionTabs: ExecutiveActionTab[];
}

export interface EmployeeExecutiveModel extends ExecutiveDashboardShared {
  role: "employee";
}

export interface ManagerExecutiveModel extends ExecutiveDashboardShared {
  role: "manager";
  deliverySummary: HomeDeliverySummary;
  teamWorkload: WorkloadRow[];
}

export interface DirectorExecutiveModel extends ExecutiveDashboardShared {
  role: "director";
  organizationFirst: true;
  deliverySummary: HomeDeliverySummary;
  organization: HomeOrganizationWorkspace;
  teamWorkload: WorkloadRow[];
}

export interface DashboardScopeHealthEvidence {
  role: HomeRoleVariant;
  focusCount: number;
  deliveryRiskCount: number;
  deliverySummary?: HomeDeliverySummary;
  teamWorkload?: WorkloadRow[];
  teamsNeedingAttention?: number;
  organizationSignalCount?: number;
  selfWorkload?: WorkloadResult | null;
}

function metricValue(
  metrics: HomePerformanceSnapshot["metrics"],
  label: string,
): string | undefined {
  return metrics.find((m) => m.label === label)?.value;
}

function countCapacityHot(workload: WorkloadRow[]): number {
  return workload.filter(
    (row) =>
      row.capacityDataState !== "insufficient_history" &&
      (row.workload === "Heavy" || row.workload === "Overloaded"),
  ).length;
}

function countOverloaded(workload: WorkloadRow[]): number {
  return workload.filter(
    (row) => row.capacityDataState !== "insufficient_history" && row.workload === "Overloaded",
  ).length;
}

export function buildScopeHealthSummary(
  role: HomeRoleVariant,
  evidence: DashboardScopeHealthEvidence,
): ScopeHealthSummary {
  const {
    focusCount,
    deliveryRiskCount,
    deliverySummary,
    teamWorkload = [],
    teamsNeedingAttention = 0,
    organizationSignalCount = 0,
    selfWorkload,
  } = evidence;

  if (role === "employee") {
    const capacityLabel = selfWorkload
      ? capacityPresentationLabel(selfWorkload)
      : CAPACITY_INSUFFICIENT_LABEL;
    const overloaded =
      isMeasuredCapacityLabel(capacityLabel) &&
      (capacityLabel === "Overloaded" || capacityLabel === "Heavy");
    if (focusCount > 0 || overloaded) {
      return {
        severity: focusCount > 2 || capacityLabel === "Overloaded" ? "critical" : "watch",
        line:
          focusCount > 0
            ? `${focusCount} item${focusCount === 1 ? "" : "s"} need your attention`
            : `Capacity is ${capacityLabel.toLowerCase()}`,
        tooltip:
          "Scope health combines your focus queue and capacity load from workflow-aware workload.",
      };
    }
    const insufficient =
      capacityDataStateFromWorkload(selfWorkload) === "insufficient_history";
    return {
      severity: "healthy",
      line: "Your scope looks healthy",
      tooltip: insufficient
        ? "No urgent focus items. Completed-cycle capacity is not measured for this period."
        : "No urgent focus items and capacity is within normal range.",
    };
  }

  if (role === "director") {
    const critical =
      teamsNeedingAttention >= 2 ||
      deliveryRiskCount >= 5 ||
      organizationSignalCount >= 8;
    const watch =
      teamsNeedingAttention > 0 ||
      deliveryRiskCount > 0 ||
      organizationSignalCount > 0;
    if (critical) {
      return {
        severity: "critical",
        line: `${teamsNeedingAttention} teams need attention · ${deliveryRiskCount} delivery risks`,
        tooltip: "Organization health aggregates team signals and delivery risk across authorized scope.",
      };
    }
    if (watch) {
      return {
        severity: "watch",
        line: "Some teams or delivery areas need a look",
        tooltip: "Review teams with elevated workload or delivery friction.",
      };
    }
    return {
      severity: "healthy",
      line: "Organization scope is steady",
      tooltip: "No elevated organization-wide signals in the current period.",
    };
  }

  const overloaded = countOverloaded(teamWorkload);
  const longReview = deliverySummary?.longReview ?? 0;
  const problematic = deliverySummary?.problematic ?? 0;
  if (deliveryRiskCount >= 3 || overloaded >= 2 || problematic > 0) {
    return {
      severity: deliveryRiskCount >= 5 || problematic > 0 ? "critical" : "watch",
      line: `${deliveryRiskCount} delivery risks · ${overloaded} overloaded`,
      tooltip: "Team health uses delivery risk, long review, and capacity levels for direct reports.",
    };
  }
  if (longReview > 0 || deliveryRiskCount > 0 || overloaded > 0) {
    return {
      severity: "watch",
      line: "Monitor delivery and capacity this week",
      tooltip: "Early signals in review time or workload distribution.",
    };
  }
  return {
    severity: "healthy",
    line: "Team scope looks healthy",
    tooltip: "Delivery and capacity are within expected bounds.",
  };
}

function attentionItemFromAction(
  id: string,
  action: ActionItem,
  detailOverride?: string,
): ExecutiveAttentionItem {
  return {
    id,
    title: action.title,
    detail: detailOverride ?? action.description,
    severity:
      action.severity === "critical"
        ? "critical"
        : action.severity === "warning"
          ? "warning"
          : "neutral",
    issueKeys: action.issueKeys,
    viewTarget: resolveAttentionViewTarget(action),
    scrollTargetId: scrollTargetIdForAction(action),
  };
}

function buildAttentionItems(input: {
  focus: ActionItem[];
  teamActions: ActionItem[];
  deliveryRiskCount: number;
  deliverySummary?: HomeDeliverySummary;
  role: HomeRoleVariant;
  teamsNeedingAttention?: number;
}): ExecutiveAttentionItem[] {
  const items: ExecutiveAttentionItem[] = [];
  for (const action of input.focus.slice(0, 3)) {
    items.push(attentionItemFromAction(`focus-${action.id}`, action));
  }
  if (input.role !== "employee") {
    for (const action of input.teamActions.slice(0, 2)) {
      items.push(
        attentionItemFromAction(`team-${action.id}`, action, "Team action"),
      );
    }
    if (input.deliveryRiskCount > 0) {
      items.push({
        id: "delivery-risk",
        title: `${input.deliveryRiskCount} delivery risk items`,
        detail: input.deliverySummary
          ? `${input.deliverySummary.problematic} problematic · ${input.deliverySummary.longReview} long review`
          : undefined,
        severity: input.deliveryRiskCount >= 3 ? "critical" : "warning",
        viewTarget: { kind: "performance", view: "delivery-risk" },
        scrollTargetId: "delivery-risk-view",
      });
    }
  }
  if (input.role === "director" && (input.teamsNeedingAttention ?? 0) > 0) {
    items.push({
      id: "org-teams",
      title: `${input.teamsNeedingAttention} teams need attention`,
      severity: "critical",
      viewTarget: { kind: "performance", view: "overview" },
      scrollTargetId: "performance-section-team-attention",
    });
  }
  return items.slice(0, 5);
}

function trendSpan(
  attentionItems: ExecutiveAttentionItem[],
): ExecutiveDashboardShared["trendSpanClass"] {
  return attentionItems.length === 0
    ? "executive-dashboard__span-12"
    : "executive-dashboard__span-8";
}

export function buildEmployeeExecutiveModel(input: {
  performanceSnapshot: HomePerformanceSnapshot;
  selfWorkload: WorkloadResult | null;
  selfAvailability?: PersonAvailability;
  focus: ActionItem[];
  trends: TrendCardData[];
}): EmployeeExecutiveModel {
  const scopeHealth = buildScopeHealthSummary("employee", {
    role: "employee",
    focusCount: input.focus.length,
    deliveryRiskCount: 0,
    selfWorkload: input.selfWorkload,
  });
  const attentionItems = buildAttentionItems({
    focus: input.focus,
    teamActions: [],
    deliveryRiskCount: 0,
    role: "employee",
  });
  return {
    role: "employee",
    scopeLabel: "Employee",
    scopeHealth,
    kpis: buildEmployeeDashboardKpis({
      metrics: input.performanceSnapshot.metrics,
      workload: input.selfWorkload,
      availability: input.selfAvailability,
    }),
    attentionItems,
    trendSpanClass: trendSpan(attentionItems),
    trends: input.trends,
    actionTabs: [
      {
        id: "focus",
        label: "My focus",
        items: input.focus,
        emptyMessage: "Nothing needs your attention right now.",
      },
    ],
  };
}

export function buildManagerExecutiveModel(input: {
  performanceSnapshot: HomePerformanceSnapshot;
  focus: ActionItem[];
  teamActions: ActionItem[];
  teamSnapshot: { summary: { label: string; value: string }[]; workload: WorkloadRow[] } | null;
  deliveryRiskCount: number;
  deliverySummary: HomeDeliverySummary;
  trends: TrendCardData[];
}): ManagerExecutiveModel {
  const teamWorkload = input.teamSnapshot?.workload ?? [];
  const scopeHealth = buildScopeHealthSummary("manager", {
    role: "manager",
    focusCount: input.focus.length,
    deliveryRiskCount: input.deliveryRiskCount,
    deliverySummary: input.deliverySummary,
    teamWorkload,
  });
  const attentionItems = buildAttentionItems({
    focus: input.focus,
    teamActions: input.teamActions,
    deliveryRiskCount: input.deliveryRiskCount,
    deliverySummary: input.deliverySummary,
    role: "manager",
  });
  const firstPass =
    input.teamSnapshot?.summary.find((m) => m.label === "First pass")?.value ??
    metricValue(input.performanceSnapshot.metrics, "First pass") ??
    "—";

  return {
    role: "manager",
    scopeLabel: "Team",
    scopeHealth,
    kpis: buildManagerDashboardKpis({
      scopeHealth,
      firstPassRate: firstPass,
      deliveryRiskCount: input.deliveryRiskCount,
      teamWorkload,
    }),
    attentionItems,
    trendSpanClass: trendSpan(attentionItems),
    trends: input.trends,
    deliverySummary: input.deliverySummary,
    teamWorkload,
    actionTabs: [
      {
        id: "focus",
        label: "My focus",
        items: input.focus,
        emptyMessage: "Nothing needs your attention right now.",
      },
      {
        id: "team",
        label: "Team actions",
        items: input.teamActions,
        emptyMessage: "No high-priority team actions right now.",
      },
    ],
  };
}

export function buildDirectorExecutiveModel(input: {
  focus: ActionItem[];
  teamActions: ActionItem[];
  teamSnapshot: { summary: { label: string; value: string }[]; workload: WorkloadRow[] } | null;
  deliveryRiskCount: number;
  deliverySummary: HomeDeliverySummary;
  organization: HomeOrganizationWorkspace;
  trends: TrendCardData[];
}): DirectorExecutiveModel {
  const teamWorkload = input.teamSnapshot?.workload ?? [];
  const scopeHealth = buildScopeHealthSummary("director", {
    role: "director",
    focusCount: input.focus.length,
    deliveryRiskCount: input.deliveryRiskCount,
    deliverySummary: input.deliverySummary,
    teamWorkload,
    teamsNeedingAttention: input.organization.teamsNeedingAttention,
    organizationSignalCount: input.organization.signalCount,
  });
  const attentionItems = buildAttentionItems({
    focus: input.focus,
    teamActions: input.teamActions,
    deliveryRiskCount: input.deliveryRiskCount,
    deliverySummary: input.deliverySummary,
    role: "director",
    teamsNeedingAttention: input.organization.teamsNeedingAttention,
  });

  const heavy = countCapacityHot(teamWorkload);
  const light = teamWorkload.filter(
    (row) =>
      row.capacityDataState !== "insufficient_history" && row.workload === "Light",
  ).length;

  return {
    role: "director",
    organizationFirst: true,
    scopeLabel: "Organization",
    scopeHealth,
    kpis: buildDirectorDashboardKpis({
      scopeHealth,
      teamsNeedingAttention: input.organization.teamsNeedingAttention,
      deliveryRiskCount: input.deliveryRiskCount,
      capacityImbalance: Math.abs(heavy - light),
    }),
    attentionItems,
    trendSpanClass: trendSpan(attentionItems),
    trends: input.trends,
    deliverySummary: input.deliverySummary,
    organization: input.organization,
    teamWorkload,
    actionTabs: [
      {
        id: "org",
        label: "Organization",
        items: input.teamActions,
        emptyMessage: "No organization-level actions right now.",
      },
      {
        id: "focus",
        label: "My focus",
        items: input.focus,
        emptyMessage: "Nothing needs your attention right now.",
      },
    ],
  };
}

export function capacityDistribution(
  workload: WorkloadRow[],
): { label: "Light" | "Balanced" | "Heavy" | "Overloaded" | typeof CAPACITY_INSUFFICIENT_LABEL; count: number }[] {
  const labels = ["Light", "Balanced", "Heavy", "Overloaded", CAPACITY_INSUFFICIENT_LABEL] as const;
  return labels.map((label) => ({
    label,
    count: workload.filter((row) => {
      if (row.capacityDataState === "insufficient_history") {
        return label === CAPACITY_INSUFFICIENT_LABEL;
      }
      if (label === CAPACITY_INSUFFICIENT_LABEL) return false;
      return row.workload === label;
    }).length,
  }));
}

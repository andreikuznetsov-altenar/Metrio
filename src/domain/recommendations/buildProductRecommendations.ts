import type { ActionItem } from "../actions/actionTypes";
import type { ExecutiveAttentionItem } from "../home/executiveDashboardModel";
import type { HomeDeliverySummary } from "../home/homeTypes";
import type { HomeRoleVariant } from "../home/homeTypes";
import type { WorkloadRow } from "../performance";

export type RecommendationSeverity = "critical" | "watch" | "neutral";

export type RecommendationActionKind =
  | "open_delivery_risk"
  | "open_jira"
  | "view_person"
  | "open_team_workload"
  | "open_performance";

export interface ProductRecommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  explanation: string;
  actionLabel: string;
  actionKind: RecommendationActionKind;
  personId?: string;
  issueKey?: string;
  priority: number;
}

export interface BuildRecommendationsInput {
  role: HomeRoleVariant;
  deliverySummary: HomeDeliverySummary;
  deliveryRiskCount: number;
  teamWorkload: WorkloadRow[];
  teamActions: ActionItem[];
  focus: ActionItem[];
  attentionItems: ExecutiveAttentionItem[];
  awayNextWeek?: number;
  teamsNeedingAttention?: number;
  maxItems: number;
}

function pushUnique(
  out: ProductRecommendation[],
  seen: Set<string>,
  rec: ProductRecommendation,
): void {
  if (seen.has(rec.id)) return;
  seen.add(rec.id);
  out.push(rec);
}

export function buildProductRecommendations(
  input: BuildRecommendationsInput,
): ProductRecommendation[] {
  const {
    role,
    deliverySummary,
    deliveryRiskCount,
    teamWorkload,
    teamActions,
    focus,
    attentionItems,
    awayNextWeek = 0,
    teamsNeedingAttention = 0,
    maxItems,
  } = input;

  const out: ProductRecommendation[] = [];
  const seen = new Set<string>();

  if (role === "director" && teamsNeedingAttention > 0) {
    pushUnique(out, seen, {
      id: "org-teams-attention",
      severity: "critical",
      title: `${teamsNeedingAttention} team${teamsNeedingAttention === 1 ? "" : "s"} need attention`,
      explanation:
        "Review organization signals and delivery friction across teams with elevated risk.",
      actionLabel: "Open Performance",
      actionKind: "open_performance",
      priority: 1,
    });
  }

  if (deliveryRiskCount >= 3 || deliverySummary.problematic > 0) {
    const parts: string[] = [];
    if (deliverySummary.longReview > 0) {
      parts.push(`${deliverySummary.longReview} long review`);
    }
    if (deliverySummary.problematic > 0) {
      parts.push(`${deliverySummary.problematic} problematic`);
    }
    pushUnique(out, seen, {
      id: "delivery-risk-review",
      severity: deliverySummary.problematic > 0 ? "critical" : "watch",
      title:
        deliveryRiskCount > 0
          ? `Review ${deliveryRiskCount} delivery risk item${deliveryRiskCount === 1 ? "" : "s"}`
          : "Review delivery risk signals",
      explanation:
        parts.length > 0
          ? `Start with the oldest review tasks and confirm ownership (${parts.join(" · ")}).`
          : "Start with the oldest review tasks and confirm whether they are waiting for feedback.",
      actionLabel: "Open Delivery Risk",
      actionKind: "open_delivery_risk",
      priority: 2,
    });
  } else if (deliverySummary.longReview > 0 && role !== "employee") {
    pushUnique(out, seen, {
      id: "long-review",
      severity: "watch",
      title: `Review ${deliverySummary.longReview} long-running review item${deliverySummary.longReview === 1 ? "" : "s"}`,
      explanation:
        "Start with the oldest review tasks and confirm whether they are waiting for feedback or should return to active work.",
      actionLabel: "Open Delivery Risk",
      actionKind: "open_delivery_risk",
      priority: 5,
    });
  }

  for (const item of [...teamActions, ...focus]) {
    if (item.kind === "leave_delivery_risk" || item.kind === "upcoming_leave") {
      if (role === "employee") continue;
      pushUnique(out, seen, {
        id: `leave-${item.personId ?? item.id}`,
        severity: "watch",
        title: item.title,
        explanation:
          item.description ??
          "Reassign or hand over review items before leave starts.",
        actionLabel: item.personId ? "View person" : "Open team overview",
        actionKind: item.personId ? "view_person" : "open_team_workload",
        personId: item.personId,
        priority: 3,
      });
      break;
    }
  }

  if (role !== "employee") {
    const hot = teamWorkload.filter(
      (row) =>
        row.capacityDataState !== "insufficient_history" &&
        (row.workload === "Heavy" || row.workload === "Overloaded"),
    );
    if (hot.length > 0) {
      pushUnique(out, seen, {
        id: "team-capacity-hot",
        severity: hot.some((r) => r.workload === "Overloaded") ? "critical" : "watch",
        title: `${hot.length} team member${hot.length === 1 ? "" : "s"} with elevated measured capacity`,
        explanation:
          "Review active work and redistribute tasks to people with measured available capacity.",
        actionLabel: "Open Team Workload",
        actionKind: "open_team_workload",
        priority: 4,
      });
    }
  }

  for (const item of [...focus, ...teamActions]) {
    if (item.kind !== "task_attention") continue;
    const issueKey = item.issueKeys?.[0];
    if (!issueKey) continue;
    if (item.description?.toLowerCase().includes("no activity")) {
      pushUnique(out, seen, {
        id: `stale-${issueKey}`,
        severity: item.severity === "critical" ? "critical" : "watch",
        title: `${issueKey} needs a status check`,
        explanation:
          item.description ??
          "Check whether the task is still active, blocked, or should move to waiting/hold.",
        actionLabel: "Open Jira",
        actionKind: "open_jira",
        issueKey,
        priority: item.severity === "critical" ? 2 : 6,
      });
      break;
    }
  }

  if (deliverySummary.backflowSignals > 0 && role !== "employee") {
    pushUnique(out, seen, {
      id: "backflow-review",
      severity: "watch",
      title: "Review recurring backflow",
      explanation:
        "Review why work returned from review/QA and identify the recurring cause.",
      actionLabel: "Open Performance",
      actionKind: "open_performance",
      priority: 7,
    });
  }

  if (awayNextWeek > 0 && role === "manager") {
    pushUnique(out, seen, {
      id: "away-next-week",
      severity: "watch",
      title: `${awayNextWeek} team member${awayNextWeek === 1 ? "" : "s"} away next week`,
      explanation: "Confirm coverage for active review and delivery work before leave starts.",
      actionLabel: "Open Team Workload",
      actionKind: "open_team_workload",
      priority: 3,
    });
  }

  if (attentionItems.some((a) => a.severity === "critical") && out.length === 0) {
    const first = attentionItems.find((a) => a.severity === "critical");
    if (first) {
      pushUnique(out, seen, {
        id: `attention-${first.id}`,
        severity: "critical",
        title: first.title,
        explanation: first.detail ?? "Address the highest-priority attention item first.",
        actionLabel: "Open Delivery Risk",
        actionKind: "open_delivery_risk",
        priority: 2,
      });
    }
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, maxItems);
}

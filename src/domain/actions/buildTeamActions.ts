import type {
  DeliveryRiskRow,
  TeamPerformanceSnapshot,
} from "../performance";
import type { FeedbackActionSummary } from "../feedback/feedbackActionSummary";
import type { ActionItem } from "./actionTypes";
import { aggregateStaleReviewActions, dedupeActions } from "./dedupeActions";
import { sortActionsByPriority } from "./actionPriority";

const MAX_TEAM = 7;

export interface BuildTeamActionsInput {
  snapshot: TeamPerformanceSnapshot;
  deliveryRisk: DeliveryRiskRow[];
  feedback?: FeedbackActionSummary;
  now?: Date;
}

export function buildTeamActions(input: BuildTeamActionsInput): ActionItem[] {
  const { snapshot, deliveryRisk, feedback } = input;
  const now = input.now ?? new Date();
  const items: ActionItem[] = [];

  for (const row of snapshot.workload) {
    if (row.workload !== "Overloaded") continue;
    items.push({
      id: `workload-${row.personId}`,
      kind: "workload",
      severity: "warning",
      title: `${row.personName ?? "Team member"} has ${row.activeWork} active tasks`,
      description: "Overloaded workload",
      personId: row.personId,
      personName: row.personName,
      count: row.activeWork,
      target: { kind: "person", personId: row.personId, tab: "work" },
      source: "jira",
    });
  }

  const staleReview = deliveryRisk
    .filter((row) => /review/i.test(row.status) && parseStageDays(row.age) >= 7)
    .map((row) => ({ issueKey: row.issueKey, daysInReview: parseStageDays(row.age) }));
  const reviewAction = aggregateStaleReviewActions(staleReview);
  if (reviewAction) items.push(reviewAction);

  for (const entry of snapshot.timeOff) {
    if (!entry.startDate) continue;
    const daysUntil = daysUntilDate(entry.startDate, now);
    if (daysUntil == null || daysUntil > 14 || daysUntil < 0) continue;
    const personWorkload = snapshot.workload.find((w) => w.personId === entry.personId);
    const active = personWorkload?.activeWork ?? 0;
    if (active === 0) continue;
    items.push({
      id: `leave-${entry.personId}-${entry.startDate}`,
      kind: daysUntil <= 5 ? "leave_delivery_risk" : "upcoming_leave",
      severity: daysUntil <= 5 ? "warning" : "info",
      title: "Upcoming leave with active work",
      description: `${entry.personName} · leave starts in ${daysUntil} days · ${active} active`,
      personId: entry.personId,
      personName: entry.personName,
      count: active,
      target: { kind: "person", personId: entry.personId, tab: "overview" },
      source: "bamboo",
    });
  }

  if (feedback?.preparedNotSent) {
    items.push({
      id: "feedback-prepared",
      kind: "feedback_pending",
      severity: "info",
      title: "Survey prepared but not sent",
      target: { kind: "feedback", tab: "survey" },
      source: "feedback",
    });
  }

  if (feedback?.pendingResponseCount && feedback.pendingResponseCount > 0) {
    items.push({
      id: "feedback-pending",
      kind: "feedback_pending",
      severity: "info",
      title: `${feedback.pendingResponseCount} recipients haven't responded`,
      count: feedback.pendingResponseCount,
      target: { kind: "feedback", tab: "delivery" },
      source: "feedback",
    });
  }

  if (feedback?.deliveryFailureCount && feedback.deliveryFailureCount > 0) {
    items.push({
      id: "feedback-failures",
      kind: "feedback_pending",
      severity: "warning",
      title: `${feedback.deliveryFailureCount} delivery failures`,
      count: feedback.deliveryFailureCount,
      target: { kind: "feedback", tab: "delivery" },
      source: "feedback",
    });
  }

  return sortActionsByPriority(dedupeActions(items)).slice(0, MAX_TEAM);
}

function parseStageDays(age: string): number {
  const match = age.match(/(\d+)\s*day/i);
  return match ? Number(match[1]) : 0;
}

function daysUntilDate(isoDate: string, now: Date): number | null {
  const start = new Date(isoDate);
  if (Number.isNaN(start.getTime())) return null;
  const diff = start.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

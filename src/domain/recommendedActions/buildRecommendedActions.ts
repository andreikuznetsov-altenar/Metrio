/**
 * Recommended Actions: a LIVE, derived list for Individual Contributors and Team Leads.
 *
 * Nothing here is persisted, read/unread, or dismissed: every call recomputes from the current
 * data, so a resolved problem simply stops producing its recommendation. All rules consume
 * existing canonical semantics (stale Review/Hold from PASS38's `checkStaleReviewOrHold`,
 * measured capacity, existing leave actions) and define no new thresholds except the documented
 * concentration constants below.
 *
 * Deliberately NOT implemented: "no new goal in N months". Metrio reads goals from BambooHR's
 * Goals Aggregate v1.2 (`/performance/employees/{id}/goals/aggregate`), which exposes
 * startDate / dueDate / completionDate but no confirmed creation timestamp. Using startDate, dueDate,
 * updates or first-seen time as a proxy would fabricate a creation date, so the rule is disabled.
 */
import type { ActionItem } from "../actions/actionTypes";
import { resolveAvailabilityPresentation } from "../availability/availabilityPresentation";
import { calendarDaysUntil, formatLeaveCountdown } from "../availability/leaveCalendar";
import { STALE_COMPLETION_THRESHOLD_DAYS, checkStaleReviewOrHold } from "../jira/issueCompletion";
import type { AuditIssue } from "../jira/types";
import type { PersonAvailability } from "../people/types";
import type { WorkloadRow } from "../performance";
import { elevatedCapacityRows, leaveActionItems } from "../recommendations/sharedRules";
import type { WorkloadResult } from "../workload/workloadEngine";
import type { RecommendedAction } from "./types";

export const MAX_VISIBLE_RECOMMENDED_ACTIONS = 3;
/** A stale item older than this is "very stale" and ranks as immediate operational risk (P1). */
export const VERY_STALE_DAYS = 90;
/** Leave is actionable when it starts within this many days (same window as the team-action rule). */
export const LEAVE_WINDOW_DAYS = 14;
/** Concentration: one owner holds at least this share and count of the current delivery-risk tasks. */
export const CONCENTRATION_MIN_COUNT = 4;
export const CONCENTRATION_MIN_SHARE = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * Stale = Review/Hold for MORE than STALE_COMPLETION_THRESHOLD_DAYS (30; exactly 30 is not stale),
 * decided only by `checkStaleReviewOrHold`, the same helper that gates PASS38's "Mark complete +".
 * This is intentionally different from the configurable `taskAttention.longReviewHighlightDays`
 * analytics threshold (Delivery Risk / team actions), which answers "which reviews look slow", not
 * "which tasks are old enough to close".
 */

export interface EmployeeRecommendationInput {
  scope: "employee";
  now: Date;
  ownedIssues: AuditIssue[];
  selfWorkload: WorkloadResult | null;
  selfAvailability?: PersonAvailability;
}

export interface DeliveryRiskOwnerRow {
  issueKey: string;
  ownerId: string;
  ownerName?: string;
}

export interface TeamLeadRecommendationInput {
  scope: "team_lead";
  now: Date;
  teamIssues: AuditIssue[];
  teamWorkload: WorkloadRow[];
  teamActions: ActionItem[];
  deliveryRiskRows: DeliveryRiskOwnerRow[];
}

export type RecommendedActionsInput = EmployeeRecommendationInput | TeamLeadRecommendationInput;

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

interface StaleGroup {
  issueKeys: string[];
  oldestDays: number;
}

function collectStale(issues: AuditIssue[], now: Date): { review: StaleGroup; hold: StaleGroup } {
  const review: StaleGroup = { issueKeys: [], oldestDays: 0 };
  const hold: StaleGroup = { issueKeys: [], oldestDays: 0 };
  const seen = new Set<string>();
  for (const issue of issues) {
    if (seen.has(issue.issueKey)) continue;
    seen.add(issue.issueKey);
    const check = checkStaleReviewOrHold(issue, now);
    if (!check.eligible || check.ageMs === null) continue;
    const group = check.stage === "review" ? review : hold;
    group.issueKeys.push(issue.issueKey);
    group.oldestDays = Math.max(group.oldestDays, Math.floor(check.ageMs / DAY_MS));
  }
  return { review, hold };
}

function staleActions(issues: AuditIssue[], now: Date, scope: "employee" | "team_lead"): RecommendedAction[] {
  const { review, hold } = collectStale(issues, now);
  const out: RecommendedAction[] = [];
  const own = scope === "employee";
  if (review.issueKeys.length > 0) {
    const n = review.issueKeys.length;
    out.push({
      id: "stale-review",
      type: "stale_review",
      priority: review.oldestDays > VERY_STALE_DAYS ? 1 : 2,
      title: "Review tasks are getting stale",
      description: own
        ? `${n} ${plural(n, "task has", "tasks have")} been in Review for more than ${STALE_COMPLETION_THRESHOLD_DAYS} days. Check whether they are still active or complete them.`
        : `${n} team ${plural(n, "task has", "tasks have")} been in Review for more than ${STALE_COMPLETION_THRESHOLD_DAYS} days. Start with the oldest and check whether they can be completed.`,
      actionLabel: own ? "Review tasks" : "Open Delivery Risk",
      destination: own
        ? { kind: "issue_list", issueKeys: review.issueKeys, title: `In Review for more than ${STALE_COMPLETION_THRESHOLD_DAYS} days` }
        : { kind: "delivery_risk" },
      affectedCount: n,
      issueKeys: review.issueKeys,
      weight: review.oldestDays,
    });
  }
  if (hold.issueKeys.length > 0) {
    const n = hold.issueKeys.length;
    out.push({
      id: "stale-hold",
      type: "stale_hold",
      priority: hold.oldestDays > VERY_STALE_DAYS ? 1 : 2,
      title: plural(n, "A task has been on hold too long", "Tasks have been on hold too long"),
      description: own
        ? `${n} ${plural(n, "task has", "tasks have")} been on hold for more than ${STALE_COMPLETION_THRESHOLD_DAYS} days. Review whether they should remain on hold.`
        : `${n} team ${plural(n, "task has", "tasks have")} been on hold for more than ${STALE_COMPLETION_THRESHOLD_DAYS} days.`,
      actionLabel: own ? "Review tasks" : "Open Delivery Risk",
      destination: own
        ? { kind: "issue_list", issueKeys: hold.issueKeys, title: `On hold for more than ${STALE_COMPLETION_THRESHOLD_DAYS} days` }
        : { kind: "delivery_risk" },
      affectedCount: n,
      issueKeys: hold.issueKeys,
      weight: hold.oldestDays,
    });
  }
  return out;
}

function employeeActions(input: EmployeeRecommendationInput): RecommendedAction[] {
  const { now, selfWorkload, selfAvailability } = input;
  const out: RecommendedAction[] = [...staleActions(input.ownedIssues, now, "employee")];

  if (
    selfWorkload &&
    selfWorkload.capacityDataState !== "insufficient_history" &&
    (selfWorkload.level === "high" || selfWorkload.level === "overloaded") &&
    selfWorkload.activeCount > 0
  ) {
    out.push({
      id: "high-workload",
      type: "high_workload",
      priority: 3,
      title: "Your active workload is high",
      description: `You currently have ${selfWorkload.activeCount} active ${plural(selfWorkload.activeCount, "task", "tasks")}. Review priorities and tasks that can be completed or reassigned.`,
      actionLabel: "View work",
      destination: { kind: "my_work" },
      affectedCount: selfWorkload.activeCount,
      weight: selfWorkload.level === "overloaded" ? 2 : 1,
    });
  }

  if (selfAvailability?.startDate && resolveAvailabilityPresentation(selfAvailability, now).phase === "upcoming") {
    const days = calendarDaysUntil(selfAvailability.startDate, now);
    const active = selfWorkload?.activeCount ?? 0;
    const inReview = selfWorkload?.inReviewCount ?? 0;
    if (days !== null && days >= 0 && days <= LEAVE_WINDOW_DAYS && (active > 0 || inReview > 0)) {
      out.push({
        id: "own-leave",
        type: "upcoming_leave",
        priority: days <= 5 && inReview > 0 ? 1 : 3,
        title: "Review work before your leave",
        description: `Your leave ${formatLeaveCountdown(selfAvailability.startDate, now)} and you still have ${active} active ${plural(active, "task", "tasks")}${inReview > 0 ? `, including ${inReview} in Review` : ""}.`,
        actionLabel: "View work",
        destination: { kind: "my_work" },
        affectedCount: active,
        weight: 100 - days,
      });
    }
  }

  return out;
}

function leadActions(input: TeamLeadRecommendationInput): RecommendedAction[] {
  const { now } = input;
  const out: RecommendedAction[] = [...staleActions(input.teamIssues, now, "team_lead")];

  for (const item of leaveActionItems(input.teamActions)) {
    out.push({
      id: `leave-${item.personId ?? item.id}`,
      type: "upcoming_leave",
      priority: item.kind === "leave_delivery_risk" ? 1 : 3,
      title: item.title,
      description: item.description ?? "Reassign or hand over review items before leave starts.",
      actionLabel: item.personId ? "View person" : "Open Team Workload",
      destination: item.personId ? { kind: "person", personId: item.personId } : { kind: "team_workload" },
      personId: item.personId,
      affectedCount: item.count,
      weight: item.kind === "leave_delivery_risk" ? 2 : 1,
    });
  }

  const hot = elevatedCapacityRows(input.teamWorkload);
  if (hot.length > 0) {
    out.push({
      id: "team-capacity",
      type: "team_capacity",
      priority: 3,
      title: `${hot.length} team ${plural(hot.length, "member has", "members have")} elevated measured capacity`,
      description: "Review active work and redistribute tasks to people with available capacity.",
      actionLabel: "Open Team Workload",
      destination: { kind: "team_workload" },
      affectedCount: hot.length,
      weight: hot.some((r) => r.workload === "Overloaded") ? 2 : 1,
    });
  }

  const concentration = deliveryRiskConcentration(input.deliveryRiskRows);
  if (concentration) {
    out.push({
      id: "delivery-risk-concentration",
      type: "delivery_risk_concentration",
      priority: 3,
      title: "Delivery risk is concentrated",
      description: `${concentration.count} of ${concentration.total} delivery-risk tasks belong to ${concentration.ownerName}.`,
      actionLabel: "Open Delivery Risk",
      destination: { kind: "delivery_risk" },
      affectedCount: concentration.count,
      weight: concentration.count,
    });
  }

  return out;
}

export function deliveryRiskConcentration(
  rows: DeliveryRiskOwnerRow[],
): { ownerName: string; count: number; total: number } | null {
  const byKey = new Map<string, DeliveryRiskOwnerRow>();
  for (const row of rows) if (!byKey.has(row.issueKey)) byKey.set(row.issueKey, row);
  const unique = [...byKey.values()];
  const total = unique.length;
  if (total < CONCENTRATION_MIN_COUNT) return null;
  const counts = new Map<string, { name: string; count: number }>();
  for (const row of unique) {
    const key = row.ownerId || row.ownerName || "unknown";
    const entry = counts.get(key) ?? { name: row.ownerName || "one team member", count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  const top = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
  if (!top || top.count < CONCENTRATION_MIN_COUNT || top.count / total < CONCENTRATION_MIN_SHARE) return null;
  return { ownerName: top.name, count: top.count, total };
}

/** Every applicable recommendation, deterministically ordered (priority, then weight, then id). */
export function buildRecommendedActions(input: RecommendedActionsInput): RecommendedAction[] {
  const all = input.scope === "employee" ? employeeActions(input) : leadActions(input);
  return all.sort(
    (a, b) => a.priority - b.priority || b.weight - a.weight || (b.affectedCount ?? 0) - (a.affectedCount ?? 0) || a.id.localeCompare(b.id),
  );
}

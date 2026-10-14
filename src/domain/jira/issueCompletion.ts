/**
 * Eligibility and target selection for completing a stale Review / Hold task from Metrio.
 *
 * Nothing here knows a Jira status NAME like "Done": targets are resolved through the
 * workflow-aware canonical mapping (project + issue type + raw status → canonical stage).
 */
import { resolveWorkflowProfile } from "../workflows/resolveWorkflowProfile";
import { canonicalStageForStatus, resolveWorkflowStage } from "../workflows/resolveWorkflowStage";
import type { CanonicalStage, WorkflowProfile } from "../workflows/types";
import type { AuditIssue, IssueEvent } from "./types";

export const STALE_COMPLETION_THRESHOLD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** One entry of Jira's `GET /issue/{key}/transitions?expand=transitions.fields`. */
export interface JiraTransition {
  id: string;
  name: string;
  to: { id?: string; name: string };
  hasScreen?: boolean;
  fields?: Record<string, { required?: boolean; hasDefaultValue?: boolean }>;
}

export interface CompletionOption {
  transitionId: string;
  /** Human Jira target status (e.g. "Closed"). */
  targetStatus: string;
}

export function parseJiraTransitions(raw: unknown): JiraTransition[] {
  const list = (raw as { transitions?: unknown[] } | null)?.transitions;
  if (!Array.isArray(list)) return [];
  const out: JiraTransition[] = [];
  for (const item of list) {
    const t = item as {
      id?: unknown;
      name?: unknown;
      to?: { id?: unknown; name?: unknown };
      hasScreen?: unknown;
      fields?: Record<string, { required?: boolean; hasDefaultValue?: boolean }>;
    };
    const id = typeof t.id === "string" || typeof t.id === "number" ? String(t.id) : "";
    const toName = typeof t.to?.name === "string" ? t.to.name : "";
    if (!id || !toName) continue;
    out.push({
      id,
      name: typeof t.name === "string" ? t.name : toName,
      to: { id: t.to?.id != null ? String(t.to.id) : undefined, name: toName },
      hasScreen: typeof t.hasScreen === "boolean" ? t.hasScreen : undefined,
      fields: t.fields && typeof t.fields === "object" ? t.fields : undefined,
    });
  }
  return out;
}

function statusEntriesSorted(issue: AuditIssue): IssueEvent[] {
  // `events` is the FULL changelog; `rangeEvents` is report-range-limited and unreliable here.
  return (issue.events ?? [])
    .filter((e) => e.eventType === "Status" && e.changedAt)
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

/**
 * When the issue ENTERED its current canonical stage (continuous across raw statuses that map
 * to the same stage). Null when the changelog cannot establish it reliably — never falls back
 * to creation date, `updated`, or other activity.
 */
export function getCurrentCanonicalStageEnteredAt(
  issue: AuditIssue,
  profile: WorkflowProfile,
): string | null {
  const currentStatus = (issue.currentStatus ?? "").trim().toLowerCase();
  if (!currentStatus) return null;
  const events = statusEntriesSorted(issue);
  if (events.length === 0) return null;
  const last = events[events.length - 1]!;
  if ((last.toValue ?? "").trim().toLowerCase() !== currentStatus) return null;
  const stage = canonicalStageForStatus(profile, issue.currentStatus ?? "");
  let enteredAt = last.changedAt;
  for (let i = events.length - 2; i >= 0; i -= 1) {
    const next = events[i + 1]!;
    const entry = events[i]!;
    const continuous =
      (next.fromValue ?? "").trim().toLowerCase() === (entry.toValue ?? "").trim().toLowerCase() &&
      canonicalStageForStatus(profile, entry.toValue ?? "") === stage;
    if (!continuous) break;
    enteredAt = entry.changedAt;
  }
  return Number.isNaN(new Date(enteredAt).getTime()) ? null : enteredAt;
}

export interface StaleStageCheck {
  eligible: boolean;
  stage: CanonicalStage;
  enteredAt: string | null;
  /** Calendar ms in the current stage (not working time). */
  ageMs: number | null;
}

/** Review or Hold for MORE than 30 days (exactly 30d is not stale). */
export function checkStaleReviewOrHold(
  issue: AuditIssue,
  now: Date,
  profile: WorkflowProfile = resolveWorkflowProfile(issue),
): StaleStageCheck {
  const stage = canonicalStageForStatus(profile, issue.currentStatus ?? "");
  const enteredAt = getCurrentCanonicalStageEnteredAt(issue, profile);
  const ageMs = enteredAt ? now.getTime() - new Date(enteredAt).getTime() : null;
  const reviewOrHold = stage === "review" || stage === "hold";
  const eligible =
    reviewOrHold && ageMs !== null && ageMs > STALE_COMPLETION_THRESHOLD_DAYS * DAY_MS;
  return { eligible, stage, enteredAt, ageMs };
}

/** A transition is executable only if Jira needs nothing from the user for it. */
export function transitionNeedsNoInput(transition: JiraTransition): boolean {
  const fields = transition.fields;
  if (!fields) return true;
  return Object.values(fields).every((field) => !field?.required);
}

/**
 * Jira-allowed transitions whose DESTINATION maps to canonical terminal success (`done`) in this
 * issue's workflow, and that Metrio can execute without inventing field values.
 */
export function selectCompletionOptions(
  issue: AuditIssue,
  transitions: JiraTransition[],
  profile: WorkflowProfile = resolveWorkflowProfile(issue),
): CompletionOption[] {
  const seen = new Set<string>();
  const options: CompletionOption[] = [];
  for (const transition of transitions) {
    if (!transitionNeedsNoInput(transition)) continue;
    const target = resolveWorkflowStage(profile, transition.to.name);
    if (target.canonicalStage !== "done" || !target.isTerminal) continue;
    if (seen.has(transition.id)) continue;
    seen.add(transition.id);
    options.push({ transitionId: transition.id, targetStatus: transition.to.name });
  }
  return options;
}

import { getWeekdayElapsedDurationMs } from "./dates";
import type { AuditIssue, IssueEvent } from "./types";

/** Jira state read back AFTER a transition was accepted. */
export interface VerifiedIssueState {
  issueKey: string;
  currentStatus: string;
  /** Status events from the freshly fetched changelog (full history). */
  statusEvents: IssueEvent[];
}

function statusEventKey(e: IssueEvent): string {
  return `${e.changedAt}|${e.fromValue}|${e.toValue}`;
}

/**
 * Pure: returns the issue with Jira's verified current status and any status events newer than
 * what Metrio already holds. Everything else (owner flags, handoffs, range events) is kept.
 */
export function applyVerifiedIssueState(issue: AuditIssue, verified: VerifiedIssueState): AuditIssue {
  const known = new Set((issue.events ?? []).map(statusEventKey));
  const existingStatus = (issue.events ?? []).filter((e) => e.eventType === "Status");
  const lastKnownAt = existingStatus.length
    ? existingStatus[existingStatus.length - 1]!.changedAt
    : null;
  let prevAt = lastKnownAt;
  const appended: IssueEvent[] = [];
  const fresh = verified.statusEvents
    .filter((e) => e.eventType === "Status" && !known.has(statusEventKey(e)))
    .filter((e) => !lastKnownAt || new Date(e.changedAt).getTime() >= new Date(lastKnownAt).getTime())
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
  for (const event of fresh) {
    appended.push({
      ...event,
      timeSincePreviousStatusMs: prevAt ? getWeekdayElapsedDurationMs(prevAt, event.changedAt) : null,
    });
    prevAt = event.changedAt;
  }
  return {
    ...issue,
    currentStatus: verified.currentStatus,
    events: [...(issue.events ?? []), ...appended],
  };
}

/** Replaces every copy of the issue (by key) inside an arbitrary nested issue list. */
export function mapIssueByKey(
  issues: AuditIssue[],
  issueKey: string,
  transform: (issue: AuditIssue) => AuditIssue,
): AuditIssue[] {
  return issues.map((issue) => (issue.issueKey === issueKey ? transform(issue) : issue));
}

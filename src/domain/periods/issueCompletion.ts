import { getStageRank } from '../jira/transitions';
import { buildCompletedCyclesFromSegments, getCycleSegments } from '../jira/cycles';
import type { AuditIssue, IssueEvent } from '../jira/types';
import type { DateRange } from './dateRange';
import { isTimestampInRange } from './dateRange';

const COMPLETION_STATUS_KEYWORDS = ['done', 'approved', 'published', 'closed'];

export function isCompletionStatus(status: string): boolean {
  const normalized = (status || '').toLowerCase();
  return COMPLETION_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/** Transition into a completion status (Done / Approved / Published / Closed). */
export function isTransitionToCompletion(fromValue: string, toValue: string): boolean {
  const fromRank = getStageRank(fromValue);
  const toRank = getStageRank(toValue);
  return toRank === 4 && fromRank > 0 && fromRank < 4;
}

/** Prefer full issue history for completion/cycle semantics. */
export function withFullIssueHistory(issue: AuditIssue): AuditIssue {
  return { ...issue, rangeEvents: [] };
}

function getAllStatusEvents(issue: AuditIssue): IssueEvent[] {
  return (issue.events || [])
    .filter((event) => event.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

/**
 * Final completion timestamp when the issue is currently in a completion status.
 * Uses the last transition into a completion status (handles backflow/reopen).
 */
export function getIssueCompletionAt(issue: AuditIssue): string | null {
  if (!isCompletionStatus(issue.currentStatus || '')) return null;

  let lastCompletion: string | null = null;
  for (const event of getAllStatusEvents(withFullIssueHistory(issue))) {
    if (isTransitionToCompletion(event.fromValue, event.toValue)) {
      lastCompletion = event.changedAt;
    }
  }
  return lastCompletion;
}

export function countBackflowEventsInRange(issue: AuditIssue, range: DateRange): number {
  return getAllStatusEvents(withFullIssueHistory(issue)).filter(
    (event) =>
      event.isBackflow &&
      !event.excludeFromEfficiencyBackflow &&
      isTimestampInRange(event.changedAt, range),
  ).length;
}

/** Canonical end-to-end cycle (todo start → done), same as avgTodoToApprovedMs per issue. */
export function getIssueFullCycleMs(issue: AuditIssue): number | null {
  const segments = getCycleSegments(withFullIssueHistory(issue));
  const cycles = buildCompletedCyclesFromSegments(segments);
  const lastCycle = cycles[cycles.length - 1];
  return lastCycle?.reviewToDone.fullCycleMs ?? null;
}

export function isIssueCompletedInRange(issue: AuditIssue, range: DateRange): boolean {
  const completedAt = getIssueCompletionAt(issue);
  return completedAt ? isTimestampInRange(completedAt, range) : false;
}

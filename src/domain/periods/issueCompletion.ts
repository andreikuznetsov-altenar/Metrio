import type { AuditIssue, IssueEvent } from '../jira/types';
import {
  extractProfileContributorCycles,
  isProfileBackflow,
} from '../workflows/profileCycles';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
import type { WorkflowProfile } from '../workflows/types';
import type { DateRange } from './dateRange';
import { isTimestampInRange } from './dateRange';

export function isCompletionStatus(
  status: string,
  profile?: WorkflowProfile,
): boolean {
  if (!profile) return false;
  return resolveWorkflowStage(profile, status).isCompletion;
}

/** Profile-aware transition into canonical successful completion. */
export function isTransitionToCompletion(
  profile: WorkflowProfile,
  fromValue: string,
  toValue: string,
): boolean {
  const from = resolveWorkflowStage(profile, fromValue);
  const to = resolveWorkflowStage(profile, toValue);
  return to.isCompletion && !from.isTerminal && from.canonicalStage !== 'unknown';
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
  const profile = resolveWorkflowProfile(issue);
  if (!isCompletionStatus(issue.currentStatus || '', profile)) return null;

  let lastCompletion: string | null = null;
  for (const event of getAllStatusEvents(withFullIssueHistory(issue))) {
    if (isTransitionToCompletion(profile, event.fromValue, event.toValue)) {
      lastCompletion = event.changedAt;
    }
  }
  return lastCompletion;
}

export function countBackflowEventsInRange(issue: AuditIssue, range: DateRange): number {
  const profile = resolveWorkflowProfile(issue);
  return getAllStatusEvents(withFullIssueHistory(issue)).filter(
    (event) =>
      isProfileBackflow(profile, event.fromValue, event.toValue, event) &&
      isTimestampInRange(event.changedAt, range),
  ).length;
}

/** Canonical end-to-end cycle (todo start → done), same as avgTodoToApprovedMs per issue. */
export function getIssueFullCycleMs(issue: AuditIssue): number | null {
  const fullIssue = withFullIssueHistory(issue);
  const profile = resolveWorkflowProfile(fullIssue);
  const cycles = extractProfileContributorCycles(fullIssue, profile);
  const lastCycle = cycles[cycles.length - 1];
  return lastCycle?.fullCycleMs ?? null;
}

export function isIssueCompletedInRange(issue: AuditIssue, range: DateRange): boolean {
  const completedAt = getIssueCompletionAt(issue);
  return completedAt ? isTimestampInRange(completedAt, range) : false;
}

import type { AuditIssue, IssueEvent } from '../jira/types';
import { getFullStatusEventsSorted } from './issueEvents';

function isCountedBackflowMarker(event: IssueEvent): boolean {
  return event.isBackflow && !event.excludeFromBackflow;
}

export interface TaskPathStage {
  /** Raw Jira status name (used for colouring). */
  status: string;
  /** True when entering this stage was a backflow. Metadata only: the Task Path tags show status names, no glyph. */
  isBackflow: boolean;
}

/**
 * Chronological stages of the task, in order, with repeats kept (In Review can appear twice).
 * Falls back to the current status alone when no history exists.
 */
export function taskPathStages(issue: AuditIssue): TaskPathStage[] {
  const statusEvents = getFullStatusEventsSorted(issue);
  const current = issue.currentStatus?.trim();
  if (!statusEvents.length) {
    return current ? [{ status: current, isBackflow: false }] : [];
  }
  const stages: TaskPathStage[] = [];
  const firstFrom = statusEvents[0].fromValue?.trim();
  if (firstFrom) stages.push({ status: firstFrom, isBackflow: false });
  for (const event of statusEvents) {
    const to = event.toValue?.trim();
    if (!to) continue;
    stages.push({ status: to, isBackflow: isCountedBackflowMarker(event) });
  }
  return stages;
}

/** Ordered status path with backflow markers, e.g. To Do → Review ↩ In Progress */
export function compressStatusPath(issue: AuditIssue): string {
  const stages = taskPathStages(issue);
  if (!stages.length) return '—';
  return stages.map((s) => (s.isBackflow ? `↩ ${s.status}` : s.status)).join(' → ');
}

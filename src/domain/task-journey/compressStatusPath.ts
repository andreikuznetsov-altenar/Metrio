import type { AuditIssue, IssueEvent } from '../jira/types';
import { getFullStatusEventsSorted } from './issueEvents';

function isEfficiencyBackflowMarker(event: IssueEvent): boolean {
  return event.isBackflow && !event.excludeFromEfficiencyBackflow;
}

/** Ordered status path with backflow markers, e.g. To Do → Review ↩ In Progress */
export function compressStatusPath(issue: AuditIssue): string {
  const statusEvents = getFullStatusEventsSorted(issue);
  const current = issue.currentStatus?.trim();

  if (!statusEvents.length) {
    return current || '—';
  }

  const parts: string[] = [];
  const firstFrom = statusEvents[0].fromValue?.trim();
  if (firstFrom) {
    parts.push(firstFrom);
  }

  for (const event of statusEvents) {
    const to = event.toValue?.trim();
    if (!to) continue;
    if (isEfficiencyBackflowMarker(event)) {
      parts.push(`↩ ${to}`);
    } else {
      parts.push(to);
    }
  }

  return parts.join(' → ');
}

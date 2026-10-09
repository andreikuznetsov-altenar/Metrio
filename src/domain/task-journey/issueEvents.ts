import type { AuditIssue, IssueEvent } from '../jira/types';

/** Full issue history — never use rangeEvents (report window is for KPIs only). */
export function getFullIssueEventsSorted(issue: AuditIssue): IssueEvent[] {
  const events = issue.events ?? [];
  return events
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.changedAt).getTime();
      const tb = new Date(b.changedAt).getTime();
      if (ta !== tb) return ta - tb;
      const typeOrder = (e: IssueEvent) => (e.eventType === 'Status' ? 0 : 1);
      return typeOrder(a) - typeOrder(b);
    });
}

export function getFullStatusEventsSorted(issue: AuditIssue): IssueEvent[] {
  return getFullIssueEventsSorted(issue).filter((e) => e.eventType === 'Status');
}

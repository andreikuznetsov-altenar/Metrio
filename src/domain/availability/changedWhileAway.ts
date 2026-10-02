import { endOfDay, parseISO } from "date-fns";
import type { AuditIssue, IssueEvent } from "../jira/types";
import type { Person } from "../people/types";
import { parseCalendarDate } from "./leaveCalendar";

export interface ReturnWorkChangeRow {
  issueKey: string;
  issueTitle: string;
  label: string;
}

export interface ChangesWhileAwaySummary {
  statusChangeCount: number;
  completedCount: number;
  assignedToYouCount: number;
  rows: ReturnWorkChangeRow[];
}

const DONE_PATTERN = /done|complete|closed|resolved/i;

export function shouldOfferReturnSummary(person: Person): boolean {
  return person.availability.state === "returns_today";
}

export function summarizeChangesWhileAway(
  person: Person,
  leaveStartIso: string,
  leaveEndIso: string,
  maxRows = 8,
): ChangesWhileAwaySummary | null {
  const start = parseCalendarDate(leaveStartIso);
  const end = parseCalendarDate(leaveEndIso);
  if (!start || !end) return null;

  const windowStart = start.getTime();
  const windowEnd = endOfDay(end).getTime();
  const canonical = person.jira?.canonicalKey;

  let statusChangeCount = 0;
  let completedCount = 0;
  let assignedToYouCount = 0;
  const rows: ReturnWorkChangeRow[] = [];

  for (const issue of person.issues) {
    for (const event of issue.events || []) {
      if (!eventInWindow(event, windowStart, windowEnd)) continue;

      if (event.eventType === "Status") {
        statusChangeCount += 1;
        if (DONE_PATTERN.test(event.toValue)) {
          completedCount += 1;
        }
        pushRow(rows, issue, `${event.fromValue} → ${event.toValue}`);
      } else if (event.eventType === "Assignee" && canonical) {
        if (event.toValue && event.toValue.toLowerCase().includes(canonical.toLowerCase())) {
          assignedToYouCount += 1;
          pushRow(rows, issue, "Assigned to you");
        }
      }
    }
  }

  if (statusChangeCount === 0 && completedCount === 0 && assignedToYouCount === 0) {
    return null;
  }

  return {
    statusChangeCount,
    completedCount,
    assignedToYouCount,
    rows: rows.slice(0, maxRows),
  };
}

function eventInWindow(event: IssueEvent, windowStart: number, windowEnd: number): boolean {
  const at = parseISO(event.changedAt).getTime();
  return at >= windowStart && at <= windowEnd;
}

function pushRow(rows: ReturnWorkChangeRow[], issue: AuditIssue, label: string): void {
  if (rows.some((row) => row.issueKey === issue.issueKey && row.label === label)) return;
  rows.push({
    issueKey: issue.issueKey,
    issueTitle: issue.issueSummary,
    label,
  });
}

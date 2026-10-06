import type { ActionItem } from "../actions/actionTypes";
import type { AuditIssue } from "../jira/types";
import type { Person } from "../people/types";
import { getOperationalIssues } from "../people/ownedIssues";
import { format, parseISO } from "date-fns";

export interface TaskListModalRow {
  issueKey: string;
  title: string;
  status: string;
  createdLabel: string;
  lastStatusChangeLabel: string;
  jiraUrl?: string;
}

function latestStatusChange(issue: AuditIssue): string | null {
  const events = [...(issue.events || [])].filter((e) => e.eventType === "Status");
  if (!events.length) return null;
  const sorted = events.sort(
    (a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt),
  );
  const at = sorted[0]?.changedAt;
  if (!at) return null;
  try {
    return format(parseISO(at), "MMM d, yyyy · HH:mm");
  } catch {
    return at;
  }
}

function createdLabel(issue: AuditIssue): string {
  try {
    return format(parseISO(issue.issueCreated), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function findIssue(persons: Person[], issueKey: string): AuditIssue | undefined {
  for (const person of persons) {
    const match = getOperationalIssues(person).find((i) => i.issueKey === issueKey);
    if (match) return match;
    const any = person.issues?.find((i) => i.issueKey === issueKey);
    if (any) return any;
  }
  return undefined;
}

export function buildTaskListModalRows(
  actions: ActionItem[],
  persons: Person[],
  jiraBaseUrl?: string,
): TaskListModalRow[] {
  const keys = new Set<string>();
  for (const item of actions) {
    if (item.target.kind === "jira") {
      keys.add(item.target.issueKey);
    }
    for (const key of item.issueKeys ?? []) {
      keys.add(key);
    }
  }

  const base = jiraBaseUrl?.replace(/\/$/, "") ?? "";

  return [...keys].map((issueKey) => {
    const issue = findIssue(persons, issueKey);
    const item = actions.find(
      (a) =>
        (a.target.kind === "jira" && a.target.issueKey === issueKey) ||
        a.issueKeys?.includes(issueKey),
    );
    return {
      issueKey,
      title: issue?.issueSummary ?? item?.title ?? issueKey,
      status: issue?.currentStatus ?? "—",
      createdLabel: issue ? createdLabel(issue) : "—",
      lastStatusChangeLabel: issue ? latestStatusChange(issue) ?? "—" : "—",
      jiraUrl: base ? `${base}/browse/${encodeURIComponent(issueKey)}` : undefined,
    };
  });
}

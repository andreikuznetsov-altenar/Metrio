import type { ActionItem } from "../actions/actionTypes";
import type { AuditIssue } from "../jira/types";
import type { Person } from "../people/types";
import { getOperationalIssues } from "../people/ownedIssues";
import {
  type IssueCatalog,
  resolveCatalogIssue,
} from "../jira/issueCatalog";
import { format, parseISO } from "date-fns";

export const TASK_LIST_ISSUE_UNAVAILABLE_TITLE = "Issue details unavailable";

export interface TaskListModalRow {
  issueKey: string;
  title: string;
  status: string;
  createdAt: string | null;
  lastStatusChangedAt: string | null;
  createdLabel: string;
  lastStatusChangeLabel: string;
  jiraUrl?: string;
}

function latestStatusChangeIso(issue: AuditIssue): string | null {
  const events = [...(issue.events || [])].filter((e) => e.eventType === "Status");
  if (!events.length) return null;
  const sorted = events.sort(
    (a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt),
  );
  return sorted[0]?.changedAt ?? null;
}

export function formatTaskCreatedLabel(issueCreated: string | undefined): string {
  if (!issueCreated) return "—";
  try {
    return format(parseISO(issueCreated), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatTaskLastStatusChangeLabel(changedAt: string | null): string {
  if (!changedAt) return "—";
  try {
    return format(parseISO(changedAt), "MMM d, yyyy · HH:mm");
  } catch {
    return changedAt;
  }
}

function findIssue(
  issueKey: string,
  persons: Person[],
  catalog?: IssueCatalog,
): AuditIssue | undefined {
  const fromCatalog = resolveCatalogIssue(catalog, issueKey);
  if (fromCatalog) return fromCatalog;
  for (const person of persons) {
    const match = getOperationalIssues(person).find((i) => i.issueKey === issueKey);
    if (match) return match;
    const any = person.issues?.find((i) => i.issueKey === issueKey);
    if (any) return any;
  }
  return undefined;
}

function rowFromIssueKey(
  issueKey: string,
  persons: Person[],
  jiraBaseUrl: string | undefined,
  catalog?: IssueCatalog,
  fallbackTitle?: string,
): TaskListModalRow {
  const issue = findIssue(issueKey, persons, catalog);
  const lastStatusChangedAt = issue ? latestStatusChangeIso(issue) : null;
  const createdAt = issue?.issueCreated ?? null;
  const base = jiraBaseUrl?.replace(/\/$/, "") ?? "";
  const title = issue?.issueSummary
    ? issue.issueSummary
    : fallbackTitle && fallbackTitle !== issueKey
      ? fallbackTitle
      : TASK_LIST_ISSUE_UNAVAILABLE_TITLE;

  return {
    issueKey,
    title,
    status: issue?.currentStatus ?? "—",
    createdAt,
    lastStatusChangedAt,
    createdLabel: issue ? formatTaskCreatedLabel(issue.issueCreated) : "—",
    lastStatusChangeLabel: issue
      ? formatTaskLastStatusChangeLabel(lastStatusChangedAt)
      : "—",
    jiraUrl: base ? `${base}/browse/${encodeURIComponent(issueKey)}` : undefined,
  };
}

export function buildTaskListModalRowsFromIssueKeys(
  issueKeys: string[],
  persons: Person[],
  jiraBaseUrl?: string,
  catalog?: IssueCatalog,
): TaskListModalRow[] {
  const unique = [...new Set(issueKeys.filter(Boolean))];
  return unique.map((issueKey) =>
    rowFromIssueKey(issueKey, persons, jiraBaseUrl, catalog),
  );
}

export function buildTaskListModalRows(
  actions: ActionItem[],
  persons: Person[],
  jiraBaseUrl?: string,
  catalog?: IssueCatalog,
): TaskListModalRow[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of actions) {
    const push = (key: string) => {
      if (seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    };
    if (item.target.kind === "jira") {
      push(item.target.issueKey);
    }
    for (const key of item.issueKeys ?? []) {
      push(key);
    }
  }

  return keys.map((issueKey) => {
    const item = actions.find(
      (a) =>
        (a.target.kind === "jira" && a.target.issueKey === issueKey) ||
        a.issueKeys?.includes(issueKey),
    );
    return rowFromIssueKey(issueKey, persons, jiraBaseUrl, catalog, item?.title);
  });
}

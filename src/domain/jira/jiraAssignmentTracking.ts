import type { AuditIssue } from "./types";

export type JiraAssignmentEventType = "jira_assignment" | "jira_reassignment";

export interface JiraAssignmentRecord {
  issueKey: string;
  title: string;
  type: JiraAssignmentEventType;
  assignedAt: string;
  readAt?: string;
}

export interface JiraAssignmentState {
  baselineComplete: boolean;
  knownAssignedIssueKeys: string[];
  records: Record<string, JiraAssignmentRecord>;
}

export const EMPTY_JIRA_ASSIGNMENT_STATE: JiraAssignmentState = {
  baselineComplete: false,
  knownAssignedIssueKeys: [],
  records: {},
};

export function currentAssignedIssueKeys(issues: AuditIssue[]): string[] {
  const keys = issues.map((issue) => issue.issueKey).filter(Boolean);
  return [...new Set(keys)].sort();
}

export interface JiraAssignmentTransition {
  newRecords: JiraAssignmentRecord[];
  nextState: JiraAssignmentState;
}

export function processJiraAssignmentSnapshot(
  issues: AuditIssue[],
  state: JiraAssignmentState,
  nowIso: string,
): JiraAssignmentTransition {
  const current = currentAssignedIssueKeys(issues);
  const known = new Set(state.knownAssignedIssueKeys);
  const records = { ...state.records };
  const newRecords: JiraAssignmentRecord[] = [];

  if (!state.baselineComplete) {
    return {
      newRecords: [],
      nextState: {
        baselineComplete: true,
        knownAssignedIssueKeys: current,
        records,
      },
    };
  }

  for (const issue of issues) {
    if (!issue.issueKey || known.has(issue.issueKey)) continue;
    const type: JiraAssignmentEventType = detectReassignment(issue)
      ? "jira_reassignment"
      : "jira_assignment";
    const record: JiraAssignmentRecord = {
      issueKey: issue.issueKey,
      title: issue.issueSummary || issue.issueKey,
      type,
      assignedAt: nowIso,
    };
    records[issue.issueKey] = record;
    newRecords.push(record);
    known.add(issue.issueKey);
  }

  const prunedKnown = current.filter((key) => known.has(key) || records[key]);
  for (const key of Object.keys(records)) {
    if (!current.includes(key) && records[key]?.readAt) {
      delete records[key];
    }
  }

  return {
    newRecords,
    nextState: {
      baselineComplete: true,
      knownAssignedIssueKeys: [...new Set([...prunedKnown, ...current])],
      records,
    },
  };
}

function detectReassignment(_issue: AuditIssue): boolean {
  return false;
}

export function unreadJiraAssignments(state: JiraAssignmentState): JiraAssignmentRecord[] {
  return Object.values(state.records)
    .filter((record) => !record.readAt)
    .sort((a, b) => a.assignedAt.localeCompare(b.assignedAt));
}

export function markJiraAssignmentRead(
  state: JiraAssignmentState,
  issueKey: string,
  readAtIso: string,
): JiraAssignmentState {
  const record = state.records[issueKey];
  if (!record) return state;
  return {
    ...state,
    records: {
      ...state.records,
      [issueKey]: { ...record, readAt: readAtIso },
    },
  };
}

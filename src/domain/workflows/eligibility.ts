import type { AuditIssue } from '../jira/types';

const EXCLUDED_ISSUE_TYPES = new Set(
  ['epic', 'provider', 'sprint update'].map((s) => s.toLowerCase()),
);

export function isExcludedIssueType(issueTypeName: string | undefined): boolean {
  const normalized = (issueTypeName || '').trim().toLowerCase();
  return EXCLUDED_ISSUE_TYPES.has(normalized);
}

export function isWorkflowKpiEligible(issue: AuditIssue): boolean {
  return !isExcludedIssueType(issue.issueTypeName);
}

export function isWorkflowCapacityEligible(issue: AuditIssue): boolean {
  return !isExcludedIssueType(issue.issueTypeName);
}

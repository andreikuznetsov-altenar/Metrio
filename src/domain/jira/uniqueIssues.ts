import type { AuditIssue } from './types';
import type { Person } from '../people/types';

/** Deduplicate issues by issueKey — first occurrence wins. */
export function dedupeIssuesByKey(issues: AuditIssue[]): AuditIssue[] {
  const map = new Map<string, AuditIssue>();
  for (const issue of issues) {
    const key = issue?.issueKey?.trim();
    if (!key || map.has(key)) continue;
    map.set(key, issue);
  }
  return [...map.values()];
}

/** Unique team issues for team-level metrics (reassigned issues counted once). */
export function collectUniqueTeamIssues(persons: Person[]): AuditIssue[] {
  return dedupeIssuesByKey(
    persons.flatMap((person) => person.issues ?? []).filter(Boolean),
  );
}

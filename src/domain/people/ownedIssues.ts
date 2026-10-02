import type { AuditIssue } from '../jira/types';
import type { Person, TeamSnapshot } from './types';

/** Issues currently assigned in Jira to this person (operational scope). */
export function filterOwnedIssues(
  issues: AuditIssue[],
  personCanonicalKey: string | null | undefined,
): AuditIssue[] {
  if (!personCanonicalKey) return [];
  const seen = new Set<string>();
  const owned: AuditIssue[] = [];
  for (const issue of issues) {
    if (issue.currentAssigneeCanonical !== personCanonicalKey) continue;
    if (seen.has(issue.issueKey)) continue;
    seen.add(issue.issueKey);
    owned.push(issue);
  }
  return owned;
}

export function getOperationalIssues(person: Person): AuditIssue[] {
  return person.ownedIssues ?? person.issues;
}

/** Ensures each issue key appears in at most one person's ownedIssues (team snapshots). */
export function assertUniqueCurrentOwnership(snapshot: TeamSnapshot): void {
  const ownerByKey = new Map<string, string>();
  for (const person of snapshot.persons) {
    for (const issue of getOperationalIssues(person)) {
      const prev = ownerByKey.get(issue.issueKey);
      if (prev && prev !== person.id) {
        throw new Error(
          `Issue ${issue.issueKey} owned by both ${prev} and ${person.id}`,
        );
      }
      ownerByKey.set(issue.issueKey, person.id);
    }
  }
}

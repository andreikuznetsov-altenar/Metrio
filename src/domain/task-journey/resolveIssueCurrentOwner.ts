import type { AuditIssue } from '../jira/types';
import { personRouteKey } from '../people/personDisplay';
import type { Person } from '../people/types';

export interface IssueCurrentOwner {
  personId?: string;
  name: string;
}

export function resolveIssueCurrentOwner(
  issue: AuditIssue,
  persons?: Person[],
): IssueCurrentOwner {
  const canonical = issue.currentAssigneeCanonical?.trim();
  const display = issue.currentAssigneeDisplayName?.trim();

  if (persons?.length) {
    const match = persons.find((p) => {
      if (canonical && (p.jira?.canonicalKey === canonical || personRouteKey(p) === canonical)) {
        return true;
      }
      const accountId = issue.currentAssigneeAccountId?.trim();
      if (accountId && p.jira?.accountId === accountId) return true;
      if (display && p.jira?.displayName === display) return true;
      return false;
    });
    if (match) {
      return { personId: match.id, name: match.bamboo.displayName };
    }
  }

  if (display) {
    return { name: display };
  }

  if (canonical) {
    return { name: canonical };
  }

  return { name: 'Unassigned' };
}

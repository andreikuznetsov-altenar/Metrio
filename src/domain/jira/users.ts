import type { TeamIdentityIndex, TeamUser } from './types';

export function normalizeTeamIdentity(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export function buildTeamIdentityIndex(
  teamUsers: TeamUser[],
  requestedUsers: string[],
): TeamIdentityIndex {
  const identifierToCanonical: Record<string, string> = {};
  const canonicalToLabel: Record<string, string> = {};

  teamUsers.forEach((user, idx) => {
    const canonical = user.canonical || requestedUsers[idx];
    canonicalToLabel[canonical] =
      user.displayName && user.displayName !== canonical
        ? `${user.displayName} <${canonical}>`
        : canonical;

    [canonical, user.inputUser, user.email, user.displayName, user.accountId].forEach((value) => {
      const key = normalizeTeamIdentity(value);
      if (key) identifierToCanonical[key] = canonical;
    });
  });

  return { identifierToCanonical, canonicalToLabel };
}

export function getCanonicalTeamMember(
  value: string,
  teamIdentityIndex: TeamIdentityIndex,
): string {
  return teamIdentityIndex.identifierToCanonical[normalizeTeamIdentity(value)] || '';
}

export function findMatchingTeamMembersForIssue(
  assignee: { accountId?: string; emailAddress?: string; displayName?: string } | null,
  events: Array<{ eventType: string; fromValue?: string; toValue?: string }>,
  teamIdentityIndex: TeamIdentityIndex,
): string[] {
  const found: Record<string, boolean> = {};
  const candidates: string[] = [];

  if (assignee) {
    [assignee.accountId, assignee.emailAddress, assignee.displayName].forEach((v) => {
      if (v) candidates.push(v);
    });
  }

  events.forEach((e) => {
    if (e.eventType === 'Assignee') {
      if (e.fromValue) candidates.push(e.fromValue);
      if (e.toValue) candidates.push(e.toValue);
    }
  });

  candidates.forEach((candidate) => {
    const canonical = getCanonicalTeamMember(candidate, teamIdentityIndex);
    if (canonical) found[canonical] = true;
  });

  return Object.keys(found);
}

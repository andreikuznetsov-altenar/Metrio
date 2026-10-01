import type { OrgResolutionResult, ResolvedEmployee } from './orgResolver';

export type TeamScopeMode = 'employee' | 'manager';

export interface TeamScope {
  mode: TeamScopeMode;
  self: ResolvedEmployee;
  /** Visible people in the app: self only, or self + immediate direct reports. Never indirect reports. */
  members: ResolvedEmployee[];
  memberIds: string[];
}

/**
 * Applies the Metrio role rule after Bamboo hierarchy resolution.
 * Managers see only immediate direct reports; `fullTeam` from org resolution is intentionally ignored.
 */
export function resolveTeamScope(org: OrgResolutionResult): TeamScope | null {
  if (!org.ok || !org.employee) {
    return null;
  }

  const self = org.employee;

  if (org.mode === 'team' && org.directReports.length > 0) {
    const members = dedupeById([self, ...org.directReports]);
    return {
      mode: 'manager',
      self,
      members,
      memberIds: members.map((m) => m.id),
    };
  }

  return {
    mode: 'employee',
    self,
    members: [self],
    memberIds: [self.id],
  };
}

function dedupeById(people: ResolvedEmployee[]): ResolvedEmployee[] {
  const seen = new Set<string>();
  const out: ResolvedEmployee[] = [];
  for (const person of people) {
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    out.push(person);
  }
  return out;
}

/** Returns true when `candidateId` is in the non-recursive team scope for `org`. */
export function isPersonInTeamScope(org: OrgResolutionResult, candidateId: string): boolean {
  const scope = resolveTeamScope(org);
  if (!scope) return false;
  return scope.memberIds.includes(String(candidateId));
}

/**
 * Detects indirect reports that would appear only via recursive `fullTeam` expansion.
 * Used in tests to prove scope stays shallow even when org resolution computed a deep tree.
 */
export function findIndirectReportsExcludedFromScope(org: OrgResolutionResult): ResolvedEmployee[] {
  const scope = resolveTeamScope(org);
  if (!scope || scope.mode !== 'manager') {
    return [];
  }

  const directIds = new Set(org.directReports.map((r) => r.id));
  return org.fullTeam.filter((person) => !directIds.has(person.id) && person.id !== org.employee?.id);
}

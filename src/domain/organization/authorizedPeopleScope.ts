import type { OrgResolutionResult, ResolvedEmployee } from "../../services/bamboo/orgResolver";
import { resolveTeamScope } from "../../services/bamboo/teamScope";
import type { UserRole } from "../types";
import { readExplicitOrganizationPersonIds } from "../../config/organizationAccess";

export type AuthorizedScopeMode = "self" | "direct_reports" | "organization";

export type AuthorizedScopeSource =
  | "bamboo_direct"
  | "explicit_config"
  | "authorized_org";

export interface AuthorizedPeopleScope {
  mode: AuthorizedScopeMode;
  personIds: string[];
  source: AuthorizedScopeSource;
}

function rosterById(org: OrgResolutionResult): Map<string, ResolvedEmployee> {
  const map = new Map<string, ResolvedEmployee>();
  const seed: ResolvedEmployee[] = [];
  if (org.employee) seed.push(org.employee);
  seed.push(...org.directReports, ...org.fullTeam);
  for (const person of seed) {
    if (!map.has(person.id)) {
      map.set(person.id, person);
    }
  }
  return map;
}

function resolveExplicitOrgPersonIds(
  org: OrgResolutionResult,
  explicitIds: string[],
): string[] {
  const roster = rosterById(org);
  const resolved: string[] = [];
  for (const id of explicitIds) {
    if (roster.has(id)) {
      resolved.push(id);
    }
  }
  return [...new Set(resolved)];
}

/**
 * Authorization for visible people. Does not change `resolveTeamScope` semantics.
 * Director role alone does not unlock organization mode.
 */
export function resolveAuthorizedPeopleScope(
  org: OrgResolutionResult,
  presentationRole: UserRole,
  explicitPersonIds: string[] = readExplicitOrganizationPersonIds(),
): AuthorizedPeopleScope {
  const teamScope = resolveTeamScope(org);
  if (!teamScope) {
    return { mode: "self", personIds: [], source: "bamboo_direct" };
  }

  if (presentationRole === "employee") {
    return {
      mode: "self",
      personIds: [teamScope.self.id],
      source: "bamboo_direct",
    };
  }

  const directIds = teamScope.memberIds;

  if (
    presentationRole === "director" &&
    explicitPersonIds.length > 0
  ) {
    const expanded = resolveExplicitOrgPersonIds(org, explicitPersonIds);
    const personIds = expanded.length > 0 ? expanded : directIds;
    return {
      mode: "organization",
      personIds: [...new Set(personIds)],
      source: "explicit_config",
    };
  }

  return {
    mode: "direct_reports",
    personIds: directIds,
    source: "bamboo_direct",
  };
}

export function membersForAuthorizedScope(
  org: OrgResolutionResult,
  scope: AuthorizedPeopleScope,
): ResolvedEmployee[] {
  const roster = rosterById(org);
  const members: ResolvedEmployee[] = [];
  for (const id of scope.personIds) {
    const person = roster.get(id);
    if (person) {
      members.push(person);
    }
  }
  return members;
}

export function canAccessOrganizationScope(
  presentationRole: UserRole,
  scope: AuthorizedPeopleScope,
): boolean {
  return presentationRole === "director" && scope.mode === "organization";
}

/** UI routing only — never grants extra people beyond `resolveAuthorizedPeopleScope`. */
export function presentationRoleFromOrg(org: OrgResolutionResult): UserRole {
  const scope = resolveTeamScope(org);
  if (!scope || scope.mode !== "manager") {
    return "employee";
  }
  if (/\bdirector\b/i.test(scope.self.jobTitle || "")) {
    return "director";
  }
  return "lead";
}

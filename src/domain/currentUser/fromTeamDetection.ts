import type { CurrentUser, UserRole } from '../types';
import type { TeamDetectionResult } from '../../services/bamboo/teamDetection';
import { resolveTeamScope } from '../../services/bamboo/teamScope';
import {
  resolveOrgRole,
} from '../organization/orgRole';
import { resolveOrgHierarchyScopeCached } from '../organization/orgHierarchyCache';

export function mapOrgRoleToPresentationRole(
  orgRole: ReturnType<typeof resolveOrgRole>,
): UserRole {
  if (!orgRole.ok) {
    return 'employee';
  }
  switch (orgRole.role) {
    case 'manager_of_managers':
      return 'director';
    case 'leaf_manager':
      return 'lead';
    default:
      return 'employee';
  }
}

/** Builds the signed-in user from Bamboo org resolution stored in preferences. */
export function buildCurrentUserFromTeamDetection(
  team: TeamDetectionResult,
): CurrentUser | null {
  if (!team.ok || !team.employee) {
    return null;
  }

  const scope = resolveTeamScope(team);
  if (!scope) {
    return null;
  }

  const orgRoleState = resolveOrgRole(team);
  const orgHierarchy = resolveOrgHierarchyScopeCached(team);
  const role = mapOrgRoleToPresentationRole(orgRoleState);

  const person = {
    id: scope.self.id,
    name: scope.self.displayName,
    role,
  };

  const orgRole = orgRoleState.ok ? orgRoleState.role : 'unresolved';

  if (scope.mode !== 'manager') {
    return {
      person,
      jobTitle: scope.self.jobTitle?.trim() || undefined,
      orgRole,
      orgHierarchy,
    };
  }

  const directReportIds = scope.members
    .filter((member) => member.id !== scope.self.id)
    .map((member) => member.id);

  return {
    person,
    jobTitle: scope.self.jobTitle?.trim() || undefined,
    team: {
      leadId: scope.self.id,
      directReportIds,
    },
    orgRole,
    orgHierarchy,
  };
}

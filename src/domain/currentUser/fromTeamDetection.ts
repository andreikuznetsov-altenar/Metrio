import type { CurrentUser, UserRole } from '../types';
import type { TeamDetectionResult } from '../../services/bamboo/teamDetection';
import { resolveTeamScope } from '../../services/bamboo/teamScope';

function inferManagerRole(jobTitle: string): UserRole {
  if (/\bdirector\b/i.test(jobTitle)) {
    return 'director';
  }
  return 'lead';
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

  const role: UserRole =
    scope.mode === 'manager'
      ? inferManagerRole(scope.self.jobTitle)
      : 'employee';

  const person = {
    id: scope.self.id,
    name: scope.self.displayName,
    role,
  };

  if (scope.mode !== 'manager') {
    return {
      person,
      jobTitle: scope.self.jobTitle?.trim() || undefined,
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
  };
}

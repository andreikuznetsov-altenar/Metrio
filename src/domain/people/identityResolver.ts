import type { TeamUser } from '../jira/types';
import type { ResolvedEmployee } from '../../services/bamboo/orgResolver';
import type { PersonJiraIdentity, PersonIdentityDiagnostics } from './types';
import { normalizeTeamIdentity } from '../jira/users';

export interface IdentityMapping {
  bambooEmployee: ResolvedEmployee;
  jiraUser: TeamUser | null;
}

export function resolveJiraIdentity(
  employee: ResolvedEmployee,
  teamUsers: TeamUser[],
): IdentityMapping {
  const warnings: string[] = [];
  const email = normalizeTeamIdentity(employee.workEmail);

  const byEmail = teamUsers.filter(
    (u) => normalizeTeamIdentity(u.email) === email && email,
  );
  if (byEmail.length === 1) {
    return {
      bambooEmployee: employee,
      jiraUser: byEmail[0],
    };
  }
  if (byEmail.length > 1) {
    warnings.push(`Ambiguous Jira match by email for ${employee.workEmail}`);
  }

  const byName = teamUsers.filter(
    (u) => normalizeTeamIdentity(u.displayName) === normalizeTeamIdentity(employee.displayName),
  );
  if (byName.length === 1) {
    warnings.push(`Matched ${employee.displayName} by display name only`);
    return { bambooEmployee: employee, jiraUser: byName[0] };
  }
  if (byName.length > 1) {
    warnings.push(`Ambiguous Jira match by display name for ${employee.displayName}`);
  }

  return { bambooEmployee: employee, jiraUser: null };
}

export function toPersonJiraIdentity(
  mapping: IdentityMapping,
): { jira: PersonJiraIdentity | null; identity: PersonIdentityDiagnostics } {
  const warnings = [...(mapping.jiraUser ? [] : ['No Jira identity resolved'])];

  if (!mapping.jiraUser) {
    return {
      jira: null,
      identity: { matchedBy: 'unresolved', warnings },
    };
  }

  const emailMatch =
    normalizeTeamIdentity(mapping.jiraUser.email) ===
    normalizeTeamIdentity(mapping.bambooEmployee.workEmail);

  return {
    jira: {
      accountId: mapping.jiraUser.accountId,
      displayName: mapping.jiraUser.displayName,
      email: mapping.jiraUser.email,
      canonicalKey: mapping.jiraUser.canonical,
    },
    identity: {
      matchedBy: emailMatch ? 'email' : mapping.jiraUser.accountId ? 'accountId' : 'displayName',
      warnings,
    },
  };
}

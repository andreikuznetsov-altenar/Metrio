import { describe, expect, it } from 'vitest';
import { resolveJiraIdentity, toPersonJiraIdentity } from './identityResolver';
import type { ResolvedEmployee } from '../../services/bamboo/orgResolver';
import type { TeamUser } from '../jira/types';

const employee: ResolvedEmployee = {
  id: '1',
  displayName: 'Anna Smith',
  firstName: 'Anna',
  lastName: 'Smith',
  workEmail: 'anna@co.com',
  jobTitle: 'Designer',
  status: 'Active',
};

const teamUsers: TeamUser[] = [
  {
    canonical: 'anna@co.com',
    inputUser: 'anna@co.com',
    email: 'anna@co.com',
    displayName: 'Anna Smith',
    accountId: 'acc-1',
  },
];

describe('identityResolver', () => {
  it('matches by normalized email', () => {
    const mapping = resolveJiraIdentity(employee, teamUsers);
    const { jira, identity } = toPersonJiraIdentity(mapping);
    expect(jira?.canonicalKey).toBe('anna@co.com');
    expect(identity.matchedBy).toBe('email');
  });

  it('does not merge ambiguous display names', () => {
    const users: TeamUser[] = [
      { canonical: 'a1', inputUser: 'a1', email: '', displayName: 'Anna Smith', accountId: '1' },
      { canonical: 'a2', inputUser: 'a2', email: '', displayName: 'Anna Smith', accountId: '2' },
    ];
    const mapping = resolveJiraIdentity(employee, users);
    expect(mapping.jiraUser).toBeNull();
  });
});

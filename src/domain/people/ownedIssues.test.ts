import { describe, expect, it } from 'vitest';
import type { AuditIssue } from '../jira/types';
import type { Person } from './types';
import { filterOwnedIssues, getOperationalIssues } from './ownedIssues';
import { testWorkload } from '../testFixtures';

function issue(
  key: string,
  currentAssigneeCanonical: string | undefined,
): AuditIssue {
  return {
    issueKey: key,
    issueSummary: 'Task',
    issueCreated: '2026-01-01T00:00:00.000Z',
    assigneeName: 'User',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events: [],
    rangeEvents: [],
    currentStatus: 'In Progress',
    currentAssigneeCanonical,
  };
}

describe('ownedIssues', () => {
  it('assigns current owner exclusively per issueKey', () => {
    const andreiKey = 'andrei@co.com';
    const valeriiaKey = 'valeriia@co.com';
    const sharedHistorical = [
      issue('ABC-123', valeriiaKey),
      issue('ABC-123', valeriiaKey),
    ];

    const andreiOwned = filterOwnedIssues(sharedHistorical, andreiKey);
    const valeriiaOwned = filterOwnedIssues(sharedHistorical, valeriiaKey);

    expect(andreiOwned).toHaveLength(0);
    expect(valeriiaOwned).toHaveLength(1);
    expect(valeriiaOwned[0].issueKey).toBe('ABC-123');
  });

  it('excludes issues with assignee outside team (no canonical)', () => {
    const owned = filterOwnedIssues([issue('X-1', undefined)], 'person@co.com');
    expect(owned).toHaveLength(0);
  });

  it('getOperationalIssues prefers ownedIssues collection', () => {
    const person = {
      id: '1',
      issues: [issue('H-1', 'other@co.com')],
      ownedIssues: [issue('O-1', 'me@co.com')],
    } as unknown as Person;
    expect(getOperationalIssues(person).map((i) => i.issueKey)).toEqual(['O-1']);
  });

  it('each issue appears on at most one person in a team snapshot', () => {
    const keys = ['a@co.com', 'b@co.com'];
    const issues = [issue('ABC-123', 'b@co.com')];
    const owners = keys.map((key) => filterOwnedIssues(issues, key).map((i) => i.issueKey));
    const flat = owners.flat();
    expect(flat).toEqual(['ABC-123']);
    expect(new Set(flat).size).toBe(flat.length);
  });
});

import { describe, expect, it } from 'vitest';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person, TeamSnapshot } from './types';
import { assertUniqueCurrentOwnership, filterOwnedIssues } from './ownedIssues';
import { buildDeliveryRiskItems } from '../radar/deliveryRisk';
import { getActiveIssues } from '../radar/taskSignals';
import { buildTeamRadar } from '../radar/teamRadar';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function handoffIssue(currentOwnerCanonical: string): AuditIssue {
  return {
    issueKey: 'ABC-123',
    issueSummary: 'Handoff task',
    issueCreated: '2026-01-01T00:00:00.000Z',
    assigneeName: 'Valeriia',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events: [],
    rangeEvents: [],
    currentStatus: 'On Hold',
    currentAssigneeCanonical: currentOwnerCanonical,
  };
}

function person(
  id: string,
  canonicalKey: string,
  historical: AuditIssue[],
  owned: AuditIssue[],
): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: '',
      workEmail: `${id}@co.com`,
      jobTitle: '',
      status: 'Active',
    },
    jira: {
      accountId: id,
      displayName: id,
      email: `${id}@co.com`,
      canonicalKey,
    },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: {
      score: 1,
      activeCount: owned.length,
      inProgressCount: owned.length,
      inReviewCount: 0,
      problematicCount: 0,
      atRiskCount: 0,
      overdueCount: 0,
      level: 'normal',
      summary: '',
    },
    performance: null,
    issues: historical,
    ownedIssues: owned,
  };
}

describe('current vs historical ownership', () => {
  const shared = handoffIssue('valeriia');

  it('filterOwnedIssues assigns ABC-123 only to current owner', () => {
    const andreiOwned = filterOwnedIssues([shared], 'andrei');
    const valeriiaOwned = filterOwnedIssues([shared], 'valeriia');
    expect(andreiOwned).toHaveLength(0);
    expect(valeriiaOwned.map((i) => i.issueKey)).toEqual(['ABC-123']);
  });

  it('operational views only show current owner after handoff Andrei → Valeriia', () => {
    const andreiHistorical = person('a', 'andrei', [shared], []);
    const valeriia = person('v', 'valeriia', [shared], [shared]);
    const snapshot: TeamSnapshot = {
      mode: 'team',
      summary: {
        available: 2,
        onVacation: 0,
        vacationSoon: 0,
        highWorkload: 0,
        problematic: 0,
      },
      persons: [andreiHistorical, valeriia],
    };

    assertUniqueCurrentOwnership(snapshot);

    expect(getActiveIssues(andreiHistorical, params)).toHaveLength(0);
    expect(getActiveIssues(valeriia, params)).toHaveLength(0);
    expect(valeriia.ownedIssues.map((i) => i.issueKey)).toEqual(['ABC-123']);

    const risk = buildDeliveryRiskItems(snapshot, params);
    const abcRows = risk.filter((r) => r.issueKey === 'ABC-123');
    expect(abcRows).toHaveLength(1);
    expect(abcRows[0].personId).toBe('v');

    const radar = buildTeamRadar(snapshot, params);
    const keysByPerson = new Map(
      radar.map((item) => [item.personId, item.relatedIssueKeys]),
    );
    expect(keysByPerson.get('a') ?? []).not.toContain('ABC-123');
    expect(keysByPerson.get('v')).toContain('ABC-123');
  });

  it('rejects duplicate current ownership in snapshot invariant', () => {
    const dup = handoffIssue('andrei');
    const snapshot: TeamSnapshot = {
      mode: 'team',
      summary: {
        available: 2,
        onVacation: 0,
        vacationSoon: 0,
        highWorkload: 0,
        problematic: 0,
      },
      persons: [
        person('1', 'andrei', [dup], [dup]),
        person('2', 'valeriia', [dup], [dup]),
      ],
    };
    expect(() => assertUniqueCurrentOwnership(snapshot)).toThrow(/ABC-123/);
  });
});

import { describe, expect, it } from 'vitest';
import type { AuditIssue } from '../jira/types';
import type { Person } from '../people/types';
import {
  enumerateLocalDateKeys,
  indexPersonDailyFlow,
  buildHistoricalPersonSnapshots,
  buildHistoricalTeamSnapshotsFromPersons,
  aggregateTeamFlowFromPersons,
  getBootstrapDateRange,
  buildHistoryScopeKey,
} from './historicalFlow';
import { HISTORICAL_BOOTSTRAP_DAYS } from './constants';

const params = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function issue(partial: Partial<AuditIssue> & { issueKey: string }): AuditIssue {
  return {
    issueSummary: partial.issueKey,
    issueCreated: '2026-01-01',
    assigneeName: 'Anna',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    currentStatus: partial.currentStatus || 'In Progress',
    rangeEvents: [],
    events: partial.events || [],
    ...partial,
  };
}

describe('historicalFlow', () => {
  it('enumerates 56 daily buckets for bootstrap range', () => {
    const now = new Date('2026-03-04T12:00:00');
    const { startKey, endKey } = getBootstrapDateRange(now);
    const keys = enumerateLocalDateKeys(startKey, endKey);
    expect(keys).toHaveLength(HISTORICAL_BOOTSTRAP_DAYS);
    expect(keys[0]).toBe('2026-01-08');
    expect(keys[keys.length - 1]).toBe('2026-03-04');
  });

  it('assigns completion and backflow to correct local day', () => {
    const keys = ['2026-02-27', '2026-02-28', '2026-03-01'];
    const issues = [
      issue({
        issueKey: 'DONE',
        currentStatus: 'Done',
        events: [
          {
            eventType: 'Status',
            changedAt: '2026-02-28T10:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'Done',
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
      issue({
        issueKey: 'BF',
        currentStatus: 'In Progress',
        events: [
          {
            eventType: 'Status',
            changedAt: '2026-02-27T15:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'In Progress',
            timeSincePreviousStatusMs: null,
            isBackflow: true,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
    ];

    const buckets = indexPersonDailyFlow(issues, keys, params);
    expect(buckets.get('2026-02-28')?.completedOnDate).toBe(1);
    expect(buckets.get('2026-02-27')?.backflowsOnDate).toBe(1);
    expect(buckets.get('2026-03-01')?.completedOnDate).toBe(0);
  });

  it('builds historical person snapshots with null state fields', () => {
    const person: Person = {
      id: '1',
      bamboo: {
        id: '1',
        displayName: 'Anna',
        firstName: 'Anna',
        lastName: '',
        workEmail: 'a@co.com',
        jobTitle: '',
        status: 'Active',
      },
      jira: { accountId: '1', displayName: 'Anna', email: 'a@co.com', canonicalKey: '1' },
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: 'available', label: 'Available', isHoliday: false },
      workload: null,
      performance: null,
      issues: [
        issue({
          issueKey: 'X',
          currentStatus: 'Done',
          events: [
            {
              eventType: 'Status',
              changedAt: '2026-02-28T10:00:00',
              changedBy: 'Anna',
              fromValue: 'Review',
              toValue: 'Done',
              timeSincePreviousStatusMs: null,
              isBackflow: false,
              isHandoff: false,
              isReturnToTeam: false,
              excludeFromEfficiencyBackflow: false,
            },
          ],
        }),
      ],
    };

    const snapshots = buildHistoricalPersonSnapshots(person, ['2026-02-28'], params);
    expect(snapshots[0].source).toBe('historical_jira');
    expect(snapshots[0].activeCount).toBeNull();
    expect(snapshots[0].completedOnDate).toBe(1);
  });

  it('builds team snapshots from unique issues without double counting', () => {
    const shared = issue({
      issueKey: 'SHARED',
      currentStatus: 'Done',
      events: [
        {
          eventType: 'Status',
          changedAt: '2026-02-28T10:00:00',
          changedBy: 'Anna',
          fromValue: 'Review',
          toValue: 'Done',
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
    });
    const persons: Person[] = [
      {
        id: '1',
        bamboo: {
          id: '1',
          displayName: 'Anna',
          firstName: 'Anna',
          lastName: '',
          workEmail: 'a@co.com',
          jobTitle: '',
          status: 'Active',
        },
        jira: { accountId: '1', displayName: 'Anna', email: 'a@co.com', canonicalKey: '1' },
        identity: { matchedBy: 'email', warnings: [] },
        availability: { state: 'available', label: 'Available', isHoliday: false },
        workload: null,
        performance: null,
        issues: [shared],
      },
      {
        id: '2',
        bamboo: {
          id: '2',
          displayName: 'Bob',
          firstName: 'Bob',
          lastName: '',
          workEmail: 'b@co.com',
          jobTitle: '',
          status: 'Active',
        },
        jira: { accountId: '2', displayName: 'Bob', email: 'b@co.com', canonicalKey: '2' },
        identity: { matchedBy: 'email', warnings: [] },
        availability: { state: 'available', label: 'Available', isHoliday: false },
        workload: null,
        performance: null,
        issues: [shared],
      },
    ];
    const team = buildHistoricalTeamSnapshotsFromPersons(persons, ['2026-02-28'], params);
    expect(team[0].completedOnDate).toBe(1);
  });

  it('aggregates team totals from person snapshots', () => {
    const personSnapshots = [
      {
        date: '2026-02-28',
        personId: '1',
        source: 'historical_jira' as const,
        activeCount: null,
        workloadLevel: null,
        atRiskCount: null,
        problematicCount: null,
        completedOnDate: 2,
        backflowsOnDate: 1,
        firstPassOnDate: 2,
        cycleMsSumOnDate: 0,
        completedWithCycleOnDate: 0,
      },
      {
        date: '2026-02-28',
        personId: '2',
        source: 'historical_jira' as const,
        activeCount: null,
        workloadLevel: null,
        atRiskCount: null,
        problematicCount: null,
        completedOnDate: 1,
        backflowsOnDate: 0,
        firstPassOnDate: 1,
        cycleMsSumOnDate: 0,
        completedWithCycleOnDate: 0,
      },
    ];
    const team = aggregateTeamFlowFromPersons(personSnapshots, ['2026-02-28']);
    expect(team[0].completedOnDate).toBe(3);
    expect(team[0].backflowsOnDate).toBe(1);
    expect(team[0].problematicTaskCount).toBeNull();
  });

  it('builds stable scope key from person ids and projects', () => {
    const key = buildHistoryScopeKey({
      personIds: ['2', '1'],
      projects: ['B', 'A'],
      scopeType: 'full',
    });
    expect(key).toBe('full|A,B|1,2');
  });
});

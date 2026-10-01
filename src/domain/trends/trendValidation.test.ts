import { describe, expect, it } from 'vitest';
import type { AuditIssue } from '../jira/types';
import type { Person } from '../people/types';
import { computeTeamFlowMetrics } from '../periods/issuePeriodMetrics';
import { getLastNDaysRange } from '../periods/dateRange';
import {
  buildHistoricalTeamSnapshotsFromPersons,
  enumerateLocalDateKeys,
} from '../history/historicalFlow';
import { teamTrendPoints } from '../snapshots/snapshotEngine';
import type { KpiSnapshotFile } from '../snapshots/types';
import {
  compareTrendPeriods,
  compareWeightedAvgCycleTrend,
  compareWeightedFirstPassTrend,
  currentPeriod,
  previousPeriod,
} from './trendEngine';

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

function person(id: string, issues: AuditIssue[]): Person {
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
    jira: { accountId: id, displayName: id, email: `${id}@co.com`, canonicalKey: id },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: null,
    performance: null,
    issues,
  };
}

describe('trend validation against unique-issue direct calculation', () => {
  const now = new Date('2026-03-04T12:00:00');
  const currentRange = getLastNDaysRange(28, now);
  const previousEnd = new Date(currentRange.start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousRange = getLastNDaysRange(28, previousEnd);

  const sharedCompleted = issue({
    issueKey: 'REASSIGN-1',
    currentStatus: 'Done',
    events: [
      {
        eventType: 'Status',
        changedAt: '2026-02-28T10:00:00',
        changedBy: 'Anna',
        fromValue: 'Review',
        toValue: 'Done',
        timeSincePreviousStatusMs: 2 * 24 * 60 * 60 * 1000,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
  });

  const sharedBackflow = issue({
    issueKey: 'REASSIGN-BF',
    currentStatus: 'In Progress',
    events: [
      {
        eventType: 'Status',
        changedAt: '2026-02-15T10:00:00',
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
  });

  const persons = [
    person('1', [sharedCompleted, sharedBackflow]),
    person('2', [sharedCompleted, sharedBackflow]),
    person('3', []),
    person('4', []),
    person('5', []),
  ];

  const dateKeys = enumerateLocalDateKeys('2026-01-08', '2026-03-04');
  const teamSnapshots = buildHistoricalTeamSnapshotsFromPersons(persons, dateKeys, params);
  const file: KpiSnapshotFile = {
    schemaVersion: 3,
    personSnapshots: [],
    teamSnapshots,
    historicalCoverage: {
      scopeKey: 'test',
      coverageStart: '2026-01-08',
      coverageEnd: '2026-03-04',
      bootstrapAt: now.toISOString(),
      bootstrapVersion: 2,
      bootstrapStatus: 'complete',
      personCount: 5,
      projectCount: 0,
      scopeType: 'full',
    },
  };

  const directCurrent = computeTeamFlowMetrics(persons, currentRange, params);
  const directPrevious = computeTeamFlowMetrics(persons, previousRange, params);

  it('matches completed trend to direct unique-issue calculation', () => {
    const completedPoints = teamTrendPoints(file, 'completedOnDate');
    const current = currentPeriod(completedPoints, 28, now);
    const trend = compareTrendPeriods(completedPoints, 'completed', 28, now);
    expect(trend.current).toBe(directCurrent.completedCount);
    expect(sumPoints(current)).toBe(directCurrent.completedCount);
  });

  it('matches backflows trend to direct unique-issue calculation', () => {
    const backflowPoints = teamTrendPoints(file, 'backflowsOnDate');
    const trend = compareTrendPeriods(backflowPoints, 'backflows', 28, now);
    expect(trend.current).toBe(directCurrent.backflowCount);
  });

  it('matches first pass trend to direct unique-issue calculation', () => {
    const completedPoints = teamTrendPoints(file, 'completedOnDate');
    const firstPassPoints = teamTrendPoints(file, 'firstPassOnDate');
    const trend = compareWeightedFirstPassTrend(completedPoints, firstPassPoints, 28, now);
    expect(trend.current).toBeCloseTo(directCurrent.firstPassPercent, 1);
  });

  it('matches avg cycle trend to direct unique-issue calculation', () => {
    const cycleSumPoints = teamTrendPoints(file, 'cycleMsSumOnDate');
    const completedWithCyclePoints = teamTrendPoints(file, 'completedWithCycleOnDate');
    const trend = compareWeightedAvgCycleTrend(cycleSumPoints, completedWithCyclePoints, 28, now);
    const expectedDays =
      directCurrent.avgCycleMs !== null ? directCurrent.avgCycleMs / (24 * 60 * 60 * 1000) : 0;
    expect(trend.current).toBeCloseTo(expectedDays, 1);
  });

  it('previous period direct metrics are stable for reassigned fixture', () => {
    expect(directPrevious.completedCount).toBe(0);
    expect(directPrevious.backflowCount).toBe(0);
  });
});

function sumPoints(points: { value: number }[]): number {
  return points.reduce((sum, p) => sum + p.value, 0);
}

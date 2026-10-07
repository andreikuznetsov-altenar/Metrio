import { describe, expect, it } from 'vitest';
import {
  createPerformanceDateRange,
  PERFORMANCE_DATE_RANGE_SESSION_KEY,
  previousComparableRange,
  readSessionPerformanceDateRange,
} from '../domain/performance/performanceDateRange';
import {
  resolveRequiredComparisonCoverage,
  resolveEffectiveReportRange,
} from '../domain/history/historyRanges';
import {
  compareTrendPeriods,
  compareWeightedAvgCycleTrend,
  compareWeightedFirstPassTrend,
  trendSufficiency,
} from '../domain/trends/trendEngine';
import {
  buildHistoricalTeamSnapshotsFromPersons,
  enumerateLocalDateKeys,
  getBootstrapDateRange,
} from '../domain/history/historicalFlow';
import {
  needsHistoricalBootstrap,
  runHistoricalBootstrap,
} from '../services/history/historicalBootstrap';
import {
  EMPTY_KPI_SNAPSHOT_FILE,
} from '../domain/snapshots/snapshotEngine';
import { KPI_SNAPSHOT_SCHEMA_VERSION, type KpiSnapshotFile } from '../domain/snapshots/types';
import {
  HISTORICAL_BOOTSTRAP_VERSION,
  SNAPSHOT_RETENTION_DAYS,
} from '../domain/history/constants';
import type { AuditIssue, IssueEvent, ReportParams } from '../domain/jira/types';
import type { Person, TeamSnapshot } from '../domain/people/types';

function dailyPoints(from: string, days: number, value = 0) {
  const start = new Date(`${from}T12:00:00`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: date.toISOString().slice(0, 10), value };
  });
}

function coveredFile(start: string, end: string): KpiSnapshotFile {
  return {
    schemaVersion: KPI_SNAPSHOT_SCHEMA_VERSION,
    personSnapshots: [{
      date: start,
      personId: 'p1',
      source: 'historical_jira',
      activeCount: null,
      workloadLevel: null,
      atRiskCount: null,
      problematicCount: null,
      completedOnDate: 0,
      backflowsOnDate: 0,
      firstPassOnDate: 0,
      cycleMsSumOnDate: 0,
      completedWithCycleOnDate: 0,
    }],
    teamSnapshots: enumerateLocalDateKeys(start, end).map((date) => ({
      date,
      source: 'historical_jira',
      atRiskTaskCount: null,
      problematicTaskCount: null,
      overloadedPeople: null,
      completedOnDate: 0,
      backflowsOnDate: 0,
      firstPassOnDate: 0,
      cycleMsSumOnDate: 0,
      completedWithCycleOnDate: 0,
    })),
    historicalCoverage: {
      scopeKey: 'full|UX|p1',
      coverageStart: start,
      coverageEnd: end,
      bootstrapAt: `${end}T12:00:00.000Z`,
      bootstrapVersion: HISTORICAL_BOOTSTRAP_VERSION,
      bootstrapStatus: 'complete',
      personCount: 1,
      projectCount: 1,
      scopeType: 'full',
    },
  };
}

function statusEvent(fromValue: string, toValue: string, changedAt: string): IssueEvent {
  return {
    eventType: 'Status',
    fromValue,
    toValue,
    changedAt,
    changedBy: 'User',
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function completedIssue(key: string): AuditIssue {
  return {
    issueKey: key,
    projectKey: 'UX',
    issueSummary: key,
    issueCreated: '2026-01-01T09:00:00.000Z',
    assigneeName: 'User',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    currentStatus: 'Done',
    events: [
      statusEvent('To Do', 'In Progress', '2026-01-02T09:00:00.000Z'),
      statusEvent('In Progress', 'In Review', '2026-01-03T09:00:00.000Z'),
      statusEvent('In Review', 'Done', '2026-01-04T09:00:00.000Z'),
    ],
    rangeEvents: [],
  };
}

function person(id: string, issues: AuditIssue[] = []): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: '',
      workEmail: `${id}@example.com`,
      jobTitle: '',
    },
    jira: null,
    identity: { matchedBy: 'unresolved', warnings: [] },
    availability: { state: 'available', label: 'Available' },
    workload: null,
    performance: null,
    issues,
    ownedIssues: issues,
  };
}

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-01-07',
  targetReviewDays: 3,
  users: [],
  projects: ['UX'],
  teamScope: 'full',
};

describe('PASS14.2 historical coverage and trends', () => {
  it('1. clean session defaults to Last 3 months', () => {
    sessionStorage.clear();
    const now = new Date('2026-10-07T12:00:00');
    const range = readSessionPerformanceDateRange(now);
    expect(range).toEqual(createPerformanceDateRange('3m', now));
    expect(range.preset).toBe('3m');
    expect(sessionStorage.getItem(PERFORMANCE_DATE_RANGE_SESSION_KEY)).toBeTruthy();
    expect(resolveEffectiveReportRange({ dateFrom: '', dateTo: '2026-10-07' }))
      .toEqual({ dateFrom: '2026-07-07', dateTo: '2026-10-07' });
  });

  it('migrates explicit legacy selection but replaces ambiguous legacy 30d default', () => {
    sessionStorage.clear();
    sessionStorage.setItem(
      'metrio.performanceDateRange.v1',
      JSON.stringify({ from: '2026-01-01', to: '2026-06-30', preset: 'custom' }),
    );
    expect(readSessionPerformanceDateRange().preset).toBe('custom');
    sessionStorage.clear();
    sessionStorage.setItem(
      'metrio.performanceDateRange.v1',
      JSON.stringify({ from: '2026-09-08', to: '2026-10-07', preset: '30d' }),
    );
    expect(readSessionPerformanceDateRange(new Date('2026-10-07T12:00:00')).preset).toBe('3m');
  });

  it('2. 3m comparison is immediately preceding and equal length', () => {
    const display = createPerformanceDateRange('3m', new Date('2026-10-07T12:00:00'));
    const coverage = resolveRequiredComparisonCoverage(display);
    expect(coverage.comparisonRange.to < display.from).toBe(true);
    expect(coverage.comparisonRange.to).toBe('2026-07-06');
  });

  it('3. 6m display requests approximately 12 months total coverage', () => {
    const display = createPerformanceDateRange('6m', new Date('2026-10-07T12:00:00'));
    const coverage = resolveRequiredComparisonCoverage(display);
    expect(enumerateLocalDateKeys(coverage.requiredFetchStart, coverage.requiredFetchEnd).length)
      .toBeGreaterThanOrEqual(365);
  });

  it('4. 1y display requests approximately two years of coverage', () => {
    const display = createPerformanceDateRange('1y', new Date('2026-10-07T12:00:00'));
    const coverage = resolveRequiredComparisonCoverage(display);
    const days = enumerateLocalDateKeys(coverage.requiredFetchStart, coverage.requiredFetchEnd).length;
    expect(days).toBeGreaterThanOrEqual(730);
    expect(days).toBeLessThanOrEqual(733);
    expect(SNAPSHOT_RETENTION_DAYS).toBeGreaterThanOrEqual(730);
  });

  it('5. a 56-day cache is insufficient for a 6m comparison', () => {
    const display = createPerformanceDateRange('6m', new Date('2026-10-07T12:00:00'));
    const required = getBootstrapDateRange({
      ...params,
      dateFrom: display.from,
      dateTo: display.to,
    });
    expect(
      needsHistoricalBootstrap(
        coveredFile('2026-08-13', '2026-10-07'),
        'full|UX|p1',
        required,
      ),
    ).toBe(true);
  });

  it('does not rebuild a complete cache that covers every required day', () => {
    const display = createPerformanceDateRange('30d', new Date('2026-10-07T12:00:00'));
    const required = getBootstrapDateRange({
      ...params,
      dateFrom: display.from,
      dateTo: display.to,
    });
    expect(
      needsHistoricalBootstrap(
        coveredFile(required.startKey, required.endKey),
        'full|UX|p1',
        required,
      ),
    ).toBe(false);
  });

  it('invalidates coverage when project or team scope changes', () => {
    const file = coveredFile('2026-08-01', '2026-10-07');
    expect(needsHistoricalBootstrap(file, 'direct|UX|p1')).toBe(true);
    expect(needsHistoricalBootstrap(file, 'full|MET|p1')).toBe(true);
  });

  it('never extends the Jira fetch range into future dates', () => {
    const coverage = resolveRequiredComparisonCoverage(
      { from: '2026-09-01', to: '2026-12-01', preset: 'custom' },
      new Date('2026-10-07T12:00:00'),
    );
    expect(coverage.requiredFetchEnd).toBe('2026-10-07');
  });

  it('6. a wider range extends historical coverage backwards', () => {
    const display = createPerformanceDateRange('6m', new Date('2026-10-07T12:00:00'));
    const reportParams = { ...params, dateFrom: display.from, dateTo: display.to };
    const snapshot = {
      mode: 'team',
      persons: [person('p1')],
      summary: { available: 1, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
    } as TeamSnapshot;
    const result = runHistoricalBootstrap(
      coveredFile('2026-08-13', '2026-10-07'),
      snapshot,
      {
        grouped: {},
        totalTransitions: 0,
        teamSummaryColumns: [],
        teamKpi: {} as never,
        perUserKpi: {},
        params: reportParams,
      },
      { now: new Date('2026-10-07T12:00:00') },
    );
    expect((result.historicalCoverage?.coverageStart || '') < '2026-04-07').toBe(true);
    expect(result.historicalCoverage?.coverageEnd).toBe('2026-10-07');
  });

  it('7. custom past range is anchored to its To date', () => {
    const points = dailyPoints('2025-01-01', 14, 1);
    points.push({ date: '2026-10-07', value: 999 });
    const comparison = compareTrendPeriods(
      points,
      'completed',
      7,
      new Date('2025-01-14T12:00:00'),
    );
    expect(comparison.sufficient).toBe(true);
    expect(comparison.current).toBe(7);
    expect(comparison.previous).toBe(7);
  });

  it('8–9. covered zero day is recorded; outside coverage is not', () => {
    const covered = dailyPoints('2026-01-01', 14, 0);
    expect(trendSufficiency(covered, 7, new Date('2026-01-14T12:00:00')).sufficient).toBe(true);
    const missing = covered.filter((point) => point.date !== '2026-01-03');
    expect(trendSufficiency(missing, 7, new Date('2026-01-14T12:00:00')).sufficient).toBe(false);
  });

  it('10. completed zero counts are a valid trend with full coverage', () => {
    const result = compareTrendPeriods(
      dailyPoints('2026-01-01', 14, 0),
      'completed',
      7,
      new Date('2026-01-14T12:00:00'),
    );
    expect(result.sufficient).toBe(true);
    expect(result.direction).toBe('flat');
  });

  it('11. first pass requires completed samples in both periods', () => {
    const completed = dailyPoints('2026-01-01', 14, 0);
    const firstPass = dailyPoints('2026-01-01', 14, 0);
    expect(
      compareWeightedFirstPassTrend(
        completed,
        firstPass,
        7,
        new Date('2026-01-14T12:00:00'),
      ).sufficient,
    ).toBe(false);
    completed[0].value = 1;
    completed[7].value = 1;
    firstPass[0].value = 1;
    firstPass[7].value = 1;
    expect(
      compareWeightedFirstPassTrend(
        completed,
        firstPass,
        7,
        new Date('2026-01-14T12:00:00'),
      ).sufficient,
    ).toBe(true);
  });

  it('12. average cycle requires completed-cycle samples in both periods', () => {
    const sums = dailyPoints('2026-01-01', 14, 0);
    const counts = dailyPoints('2026-01-01', 14, 0);
    expect(
      compareWeightedAvgCycleTrend(sums, counts, 7, new Date('2026-01-14T12:00:00')).sufficient,
    ).toBe(false);
    sums[0].value = 86400000;
    sums[7].value = 86400000;
    counts[0].value = 1;
    counts[7].value = 1;
    expect(
      compareWeightedAvgCycleTrend(sums, counts, 7, new Date('2026-01-14T12:00:00')).sufficient,
    ).toBe(true);
  });

  it('13. backflows can validly be zero', () => {
    const result = compareTrendPeriods(
      dailyPoints('2026-01-01', 14, 0),
      'backflows',
      7,
      new Date('2026-01-14T12:00:00'),
    );
    expect(result.sufficient).toBe(true);
    expect(result.current).toBe(0);
  });

  it('14. team historical totals dedupe the same Jira issue across people', () => {
    const shared = completedIssue('UX-1');
    const snapshots = buildHistoricalTeamSnapshotsFromPersons(
      [person('a', [shared]), person('b', [shared])],
      enumerateLocalDateKeys('2026-01-01', '2026-01-07'),
      params,
    );
    expect(snapshots.reduce((sum, day) => sum + day.completedOnDate, 0)).toBe(1);
  });

  it('empty snapshot remains a valid bootstrap input', () => {
    expect(EMPTY_KPI_SNAPSHOT_FILE.personSnapshots).toEqual([]);
    expect(previousComparableRange({ from: '2026-01-08', to: '2026-01-14', preset: 'custom' }))
      .toMatchObject({ from: '2026-01-01', to: '2026-01-07' });
  });
});

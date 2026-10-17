import { describe, expect, it } from 'vitest';
import {
  buildHistoricalPersonSnapshots,
  buildHistoricalTeamSnapshotsFromPersons,
  enumerateLocalDateKeys,
} from './historicalFlow';
import { computeIssuesFlowMetrics, countDailyFlowOnDate } from '../periods/issuePeriodMetrics';
import { collectReportingPeriodCycles } from '../analytics/kpiCycleEvidence';
import { buildKpiFromIssues } from '../jira/kpi';
import { compareMedianDurationTrend } from '../trends/trendEngine';
import { getLocalDayRangeFromKey } from '../periods/dateRange';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import { testWorkload } from '../testFixtures';

/**
 * Trend history, daily snapshots and period metrics must use the KPI's own population: issue types
 * the KPI excludes (epics, providers, sprint updates) contribute no cycle, backflow or sample.
 */
const params: ReportParams = {
  dateFrom: '2026-10-03',
  dateTo: '2026-10-30',
  targetReviewDays: 3,
  users: [],
  projects: [],
};
const VAL = 'valeriia.pavlova@altenar.com';
const DAYS = enumerateLocalDateKeys('2026-09-19', '2026-10-30');
const NOW = new Date('2026-10-30T12:00:00Z');

function status(changedAt: string, fromValue: string, toValue: string): IssueEvent {
  return {
    eventType: 'Status', changedAt, changedBy: 'x', fromValue, toValue,
    timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false,
    isReturnToTeam: false, excludeFromBackflow: false,
  };
}

/** One completed cycle executed by `VAL`: started `start` 09:00Z, done `done` 12:00Z. */
function issue(key: string, type: string, start: string, done: string): AuditIssue {
  return {
    issueKey: key, issueSummary: key, issueCreated: '2026-09-01', assigneeName: VAL,
    currentAssigneeCanonical: VAL, issueTypeName: type,
    contentType: '', designImprovementType: '', epicKey: '', epicSummary: '', epicStatus: '',
    epicContentType: '', epicDesignImprovementType: '', currentStatus: 'Done', rangeEvents: [],
    events: [
      status(`${start}T09:00:00Z`, 'To Do', 'In Progress'),
      status(`${start}T13:00:00Z`, 'In Progress', 'Review'),
      status(`${done}T12:00:00Z`, 'Review', 'Done'),
    ],
  } as AuditIssue;
}

function person(id: string, canonical: string, issues: AuditIssue[]): Person {
  return {
    id,
    bamboo: { id, displayName: id, firstName: id, lastName: '', workEmail: canonical, jobTitle: '', status: 'Active' },
    jira: { accountId: id, displayName: id, email: canonical, canonicalKey: canonical },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: testWorkload({ level: 'normal' }),
    performance: null,
    issues,
  } as unknown as Person;
}

// Previous 14 days (Oct 3-16): three short eligible cycles (~1 day) and four very long epic cycles.
// Current 14 days (Oct 17-30): three eligible cycles of ~4 days. Eligible trend: slower (+).
// Counting the epics would push the previous median far above the current one: a reversed trend.
const eligiblePrev = [
  issue('UX-1', 'Task', '2026-10-05', '2026-10-06'),
  issue('UX-2', 'Task', '2026-10-06', '2026-10-07'),
  issue('UX-3', 'Task', '2026-10-07', '2026-10-08'),
];
const eligibleCur = [
  issue('UX-4', 'Task', '2026-10-19', '2026-10-23'),
  issue('UX-5', 'Task', '2026-10-20', '2026-10-23'),
  issue('UX-6', 'Task', '2026-10-19', '2026-10-22'),
];
const epics = ['UX-90', 'UX-91', 'UX-92', 'UX-93'].map((key) => issue(key, 'Epic', '2026-10-05', '2026-10-16'));
const eligible = [...eligiblePrev, ...eligibleCur];
const all = [...eligible, ...epics];

const samplePoints = (rows: { date: string; cycleMsSamplesOnDate?: number[] }[]) =>
  rows.map((row) => ({ date: row.date, samples: row.cycleMsSamplesOnDate ?? [] }));
const pooled = (rows: { cycleMsSamplesOnDate?: number[] }[]) => rows.flatMap((r) => r.cycleMsSamplesOnDate ?? []);

describe('trend and snapshot paths use the KPI eligibility rule', () => {
  it('an ineligible issue contributes zero trend samples', () => {
    const rows = buildHistoricalTeamSnapshotsFromPersons([person('p', VAL, epics)], DAYS, params);
    expect(rows.reduce((s, r) => s + r.completedOnDate, 0)).toBe(0);
    expect(pooled(rows)).toEqual([]);
    expect(rows.reduce((s, r) => s + r.backflowsOnDate, 0)).toBe(0);
  });

  it('eligible samples reconcile exactly with the canonical KPI cycle samples', () => {
    const p = person('p', VAL, all);
    const team = buildHistoricalTeamSnapshotsFromPersons([p], DAYS, params);
    const mine = buildHistoricalPersonSnapshots(p, DAYS, params);
    const kpi = buildKpiFromIssues(p.issues, {}, { ...params, dateFrom: '2026-09-19' }, { contributorCanonical: VAL });
    expect(kpi.completedCount).toBe(eligible.length);
    expect(team.reduce((s, r) => s + r.completedOnDate, 0)).toBe(kpi.completedCount);
    expect(mine.reduce((s, r) => s + r.completedOnDate, 0)).toBe(kpi.completedCount);
    expect(pooled(team).length).toBe(kpi.cycleSampleCount);
    expect(pooled(mine).length).toBe(kpi.cycleSampleCount);
  });

  it('team and person current/previous period sample counts reconcile', () => {
    const p = person('p', VAL, all);
    const team = buildHistoricalTeamSnapshotsFromPersons([p], DAYS, params);
    const mine = buildHistoricalPersonSnapshots(p, DAYS, params);
    const inWindow = (rows: { date: string; cycleMsSamplesOnDate?: number[] }[], from: string, to: string) =>
      pooled(rows.filter((r) => r.date >= from && r.date <= to)).length;
    for (const rows of [team, mine]) {
      expect(inWindow(rows, '2026-10-03', '2026-10-16')).toBe(eligiblePrev.length);
      expect(inWindow(rows, '2026-10-17', '2026-10-30')).toBe(eligibleCur.length);
    }
  });

  it('excluded issue types cannot reverse the Cycle Time trend direction', () => {
    const p = person('p', VAL, all);
    const rows = buildHistoricalTeamSnapshotsFromPersons([p], DAYS, params);
    const trend = compareMedianDurationTrend(samplePoints(rows), 'cycleTime', 14, NOW);
    expect(trend.sufficient).toBe(true);
    expect(trend.currentSamples).toBe(3);
    expect(trend.previousSamples).toBe(3);
    expect(trend.absoluteDelta).toBeGreaterThan(0);
    // Counterfactual: if the four epic cycles were eligible they would dominate the previous
    // median and flip the sign, which is exactly the defect this rule prevents.
    const epicsAsTasks = epics.map((e) => ({ ...e, issueTypeName: 'Task' }) as AuditIssue);
    const counterfactual = compareMedianDurationTrend(
      samplePoints(buildHistoricalTeamSnapshotsFromPersons([person('p', VAL, [...eligible, ...epicsAsTasks])], DAYS, params)),
      'cycleTime', 14, NOW,
    );
    expect(counterfactual.absoluteDelta).toBeLessThan(0);
  });

  it('a person\'s trend keeps their own cycle on an issue that was later reassigned', () => {
    const ANDREI = 'andrei.kuznetsov@altenar.com';
    const reassigned = {
      ...issue('UX-2962', 'Task', '2026-10-19', '2026-10-22'),
      currentAssigneeCanonical: VAL,
      events: [
        {
          eventType: 'Assignee', changedAt: '2026-10-23T08:00:00Z', changedBy: 'x', fromValue: 'Andrei',
          toValue: 'Valeriia', fromCanonical: ANDREI, toCanonical: VAL, timeSincePreviousStatusMs: null,
          isBackflow: false, isHandoff: false, isReturnToTeam: false, excludeFromBackflow: false,
        } as IssueEvent,
        ...issue('UX-2962', 'Task', '2026-10-19', '2026-10-22').events,
      ],
    } as AuditIssue;
    const andrei = { ...person('andrei', ANDREI, [reassigned]), ownedIssues: [] } as Person;
    const valeriia = { ...person('val', VAL, [reassigned]), ownedIssues: [reassigned] } as Person;
    const count = (p: Person) => buildHistoricalPersonSnapshots(p, DAYS, params).reduce((n, r) => n + r.completedOnDate, 0);
    const kpi = (p: Person, who: string) =>
      buildKpiFromIssues(p.issues, {}, { ...params, dateFrom: '2026-09-19' }, { contributorCanonical: who }).completedCount;
    expect(count(andrei)).toBe(1);
    expect(count(andrei)).toBe(kpi(andrei, ANDREI));
    expect(count(valeriia)).toBe(0);
    expect(count(valeriia)).toBe(kpi(valeriia, VAL));
  });

  it('live daily snapshot recording (countDailyFlowOnDate) follows the same rule', () => {
    const day = (issues: AuditIssue[], key: string, who?: string) => countDailyFlowOnDate(issues, key, params, who);
    expect(day(epics, '2026-10-16', VAL).completedOnDate).toBe(0);
    expect(day(epics, '2026-10-16').cycleMsSamplesOnDate ?? []).toEqual([]);
    expect(day(all, '2026-10-23', VAL).completedOnDate).toBe(2);
    expect(day(all, '2026-10-08').completedOnDate).toBe(1);
    expect(getLocalDayRangeFromKey('2026-10-23').start).toBeInstanceOf(Date);
  });

  it('period flow metrics and drill-down evidence follow the same rule', () => {
    const range = { start: new Date('2026-10-03T00:00:00Z'), end: new Date('2026-10-31T00:00:00Z') };
    const metrics = computeIssuesFlowMetrics(all, range, params, VAL);
    expect(metrics.completedCount).toBe(eligible.length);
    expect(computeIssuesFlowMetrics(epics, range, params, VAL).completedCount).toBe(0);
    expect(collectReportingPeriodCycles(epics, { ...params, dateFrom: '2026-09-19' })).toEqual([]);
    expect(collectReportingPeriodCycles(all, { ...params, dateFrom: '2026-09-19' }).length).toBe(eligible.length);
  });
});

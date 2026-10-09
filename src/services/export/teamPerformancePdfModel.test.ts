import { describe, expect, it } from 'vitest';
import { buildTeamPerformancePdfLayout, formatPdfReportRangeTitle } from './teamPerformancePdfModel';
import { EMPTY_KPI_SNAPSHOT_FILE } from '../../domain/snapshots/snapshotEngine';
import type { TeamPerformanceSnapshot } from '../../domain/performance';
import type { TeamSnapshot } from '../../domain/people/types';
import type { AuditReportData } from '../../domain/jira/types';
import { testKpi } from '../../domain/testFixtures';

const reportRange = { from: '2026-07-08', to: '2026-10-08' };

const teamOverview: TeamPerformanceSnapshot = {
  directReportIds: ['p2'],
  summary: [
    { label: 'Efficiency', value: '91%' },
    { label: 'First pass', value: '88%' },
    { label: 'Completed', value: '42' },
    { label: 'Backflows', value: '3' },
  ],
  attention: [
    {
      personId: 'p2',
      personName: 'Sam',
      reason: 'High workload',
      severity: 'warning',
      issueKeys: ['ABC-1'],
      issueCount: 1,
      workload: 'High',
    },
  ],
  attentionTotalCount: 1,
  trends: [
    {
      label: 'Completed',
      value: '42',
      chartSeries: [
        { date: '2026-07-08', value: 1 },
        { date: '2026-08-01', value: 4 },
        { date: '2026-10-08', value: 6 },
      ],
    },
  ],
  workload: [
    {
      personId: 'p2',
      personName: 'Sam',
      activeWork: 5,
      atRisk: 1,
      workload: 'High',
      availability: 'Available',
    },
  ],
  timeOff: [],
  personDetails: {},
};

const teamSnapshot: TeamSnapshot = {
  mode: 'team',
  persons: [],
  summary: {
    available: 1,
    onVacation: 0,
    vacationSoon: 0,
    highWorkload: 1,
    problematic: 0,
  },
};

const reportData: AuditReportData = {
  params: {
    dateFrom: reportRange.from,
    dateTo: reportRange.to,
    targetReviewDays: 3,
    users: [],
    projects: [],
  },
  grouped: {},
  totalTransitions: 0,
  teamSummaryColumns: [],
  teamKpi: testKpi(),
  perUserKpi: {},
};

describe('teamPerformancePdfModel', () => {
  it('formats selected report range title', () => {
    expect(formatPdfReportRangeTitle(reportRange)).toBe('8 Jul 2026 — 8 Oct 2026');
  });

  it('uses canonical KPI overview metrics and selected range semantics', () => {
    const layout = buildTeamPerformancePdfLayout({
      reportRange,
      teamOverview,
      teamSnapshot,
      reportData,
      kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
      companyLogoSrc: 'data:image/svg+xml;base64,AAA',
      companyLogoSource: 'bundled',
    });

    expect(layout.reportRange).toEqual(reportRange);
    expect(layout.teamName).toBeTruthy();
    expect(layout.teamEfficiency.hero.value).toBe('91%');
    expect(layout.teamEfficiency.supporting.map((kpi) => kpi.label)).toEqual([
      'First pass',
      'Completed',
      'Backflows',
    ]);
    expect(layout.digestSummary).toContain('Jul 2026');
    expect(layout.digestRecentChanges.title).toBe('Recent changes');
    expect(layout.teamAttention).toBeUndefined();
    expect(layout.teamTrends[0]?.chartPoints.length).toBeGreaterThan(1);
  });
});

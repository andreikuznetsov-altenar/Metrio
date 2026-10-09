import { describe, expect, it } from 'vitest';
import { buildPerformanceExportData } from './buildPerformanceExportData';
import { DEFAULT_PREFERENCES } from '../../platform/preferences';
import { EMPTY_KPI_SNAPSHOT_FILE } from '../../domain/snapshots/snapshotEngine';
import type { TeamSnapshot } from '../../domain/people/types';
import type { AuditReportData } from '../../domain/jira/types';
import { testKpi } from '../../domain/testFixtures';
import { formatGeneratedTimestamp } from '../../platform/timezone';

const params = {
  dateFrom: '2026-03-01',
  dateTo: '2026-03-29',
  targetReviewDays: 3,
  users: [],
  projects: ['PRJ'],
};

const snapshot: TeamSnapshot = {
  mode: 'team',
  persons: [],
  summary: {
    available: 5,
    onVacation: 0,
    vacationSoon: 0,
    highWorkload: 1,
    problematic: 2,
  },
};

const reportData: AuditReportData = {
  params,
  grouped: {},
  totalTransitions: 0,
  teamSummaryColumns: [],
  teamKpi: testKpi({
    efficiencyIndex: 80,
    completedCount: 12,
    backflowCount: 1,
    startedCount: 15,
    firstPassAcceptedCount: 10,
  }),
  perUserKpi: {},
};

describe('buildPerformanceExportData', () => {
  it('includes report filters in metadata', () => {
    const generatedAt = new Date(2026, 8, 25, 12, 53);
    const payload = buildPerformanceExportData({
      view: 'team-overview',
      snapshot,
      reportData,
      kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
      firstPassMetrics: { official: { firstPassRatePercent: 88 } },
      prefs: {
        ...DEFAULT_PREFERENCES,
        reportFilters: {
          ...DEFAULT_PREFERENCES.reportFilters,
          dateFrom: '2026-03-01',
          dateTo: '2026-03-29',
          teamScope: 'full',
          projects: ['PRJ'],
        },
      },
      generatedAt,
    });

    expect(payload.metadata.reportRange).toBe('01/03/2026 - 29/03/2026');
    expect(payload.metadata.teamScope).toBe('Full reporting tree');
    expect(payload.metadata.projects).toBe('PRJ');
    expect(payload.metadata.generatedAt).toBe(formatGeneratedTimestamp(generatedAt));
    expect(payload.metadata.targetReviewDays).toBe(3);
  });

  it('includes expected team overview sections', () => {
    const payload = buildPerformanceExportData({
      view: 'team-overview',
      snapshot,
      reportData,
      kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
      firstPassMetrics: { official: { firstPassRatePercent: 88 } },
      prefs: DEFAULT_PREFERENCES,
    });

    const titles = payload.sections.map((section) => section.title);
    expect(titles).toContain('Team attention');
    expect(titles).toContain('KPI overview');
    expect(titles).toContain('Team Trends');
    expect(titles).toContain('Workload Balance');
    expect(titles).not.toContain('Upcoming time off');
  });

  it('does not include credential fields', () => {
    const payload = buildPerformanceExportData({
      view: 'team-delivery-risk',
      snapshot,
      reportData,
      kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
      firstPassMetrics: null,
      prefs: {
        ...DEFAULT_PREFERENCES,
        jiraEmail: 'secret@co.com',
      },
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('secret@co.com');
    expect(serialized).not.toContain('token');
  });
});

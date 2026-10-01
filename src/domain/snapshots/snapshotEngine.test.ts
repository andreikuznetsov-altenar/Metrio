import { describe, expect, it } from 'vitest';
import { EMPTY_KPI_SNAPSHOT_FILE, migrateKpiSnapshotFile, recordDailySnapshots } from './snapshotEngine';
import { KPI_SNAPSHOT_SCHEMA_VERSION } from './types';
import type { TeamSnapshot } from '../people/types';
import type { AuditReportData } from '../jira/types';
import { testKpi, testWorkload } from '../testFixtures';

const snapshot: TeamSnapshot = {
  mode: 'personal',
  persons: [
    {
      id: '1',
      bamboo: {
        id: '1',
        displayName: 'Me',
        firstName: 'Me',
        lastName: '',
        workEmail: 'me@co.com',
        jobTitle: '',
        status: 'Active',
      },
      jira: { accountId: '1', displayName: 'Me', email: 'me@co.com', canonicalKey: '1' },
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: 'available', label: 'Available', isHoliday: false },
      workload: testWorkload({ level: 'normal', activeCount: 2 }),
      performance: testKpi({
        startedCount: 1,
        reviewSubmittedCount: 1,
        completedCount: 5,
        firstPassAcceptedCount: 4,
        backflowCount: 1,
        efficiencyIndex: 80,
      }),
      issues: [],
    },
  ],
  summary: { available: 1, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
};

const reportData: AuditReportData = {
  grouped: {},
  totalTransitions: 0,
  teamSummaryColumns: [],
  teamKpi: testKpi({
    startedCount: 1,
    reviewSubmittedCount: 1,
    completedCount: 5,
    firstPassAcceptedCount: 4,
    backflowCount: 1,
    efficiencyIndex: 80,
    avgProgressToReviewMs: 3 * 24 * 60 * 60 * 1000,
  }),
  perUserKpi: {},
  params: {
    dateFrom: '2026-01-01',
    dateTo: '2026-03-01',
    targetReviewDays: 3,
    users: [],
    projects: [],
  },
};

describe('snapshotEngine', () => {
  it('records one snapshot per person per day', () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const first = recordDailySnapshots(EMPTY_KPI_SNAPSHOT_FILE, snapshot, reportData, now);
    const second = recordDailySnapshots(first, snapshot, reportData, now);
    expect(second.personSnapshots).toHaveLength(1);
    expect(second.teamSnapshots).toHaveLength(1);
  });

  it('migrates v1 cumulative flow fields to v2 daily semantics', () => {
    const migrated = migrateKpiSnapshotFile({
      schemaVersion: 1,
      personSnapshots: [
        {
          date: '2026-02-01',
          personId: '1',
          activeCount: 2,
          workloadLevel: 'normal',
          atRiskCount: 0,
          problematicCount: 0,
          completedCount: 50,
          firstPassPercent: 90,
          avgCycleMs: 1000,
          backflowCount: 3,
        },
      ],
      teamSnapshots: [],
    } as unknown as Parameters<typeof migrateKpiSnapshotFile>[0]);
    expect(migrated.schemaVersion).toBe(KPI_SNAPSHOT_SCHEMA_VERSION);
    expect(migrated.personSnapshots[0].completedOnDate).toBe(0);
    expect(migrated.personSnapshots[0].activeCount).toBe(2);
  });

  it('uses local date key for snapshot date', () => {
    const now = new Date('2026-03-04T15:00:00');
    const file = recordDailySnapshots(EMPTY_KPI_SNAPSHOT_FILE, snapshot, reportData, now);
    expect(file.personSnapshots[0]?.date).toBe('2026-03-04');
  });

  it('migrates v2 snapshots to v3 with source and nullable semantics', () => {
    const migrated = migrateKpiSnapshotFile({
      schemaVersion: 2,
      personSnapshots: [
        {
          date: '2026-02-01',
          personId: '1',
          activeCount: 2,
          workloadLevel: 'normal',
          atRiskCount: 0,
          problematicCount: 0,
          completedOnDate: 1,
          backflowsOnDate: 0,
          firstPassOnDate: 1,
          cycleMsSumOnDate: 0,
          completedWithCycleOnDate: 0,
        },
      ],
      teamSnapshots: [],
    } as unknown as Parameters<typeof migrateKpiSnapshotFile>[0]);
    expect(migrated.schemaVersion).toBe(KPI_SNAPSHOT_SCHEMA_VERSION);
    expect(migrated.personSnapshots[0].source).toBe('live_daily');
  });
});

import { describe, expect, it } from 'vitest';
import { buildTeamDigestSections, buildTeamWeeklyDigest } from './weeklyDigest';
import type { TeamSnapshot } from '../people/types';
import type { AuditReportData } from '../jira/types';
import { EMPTY_KPI_SNAPSHOT_FILE } from '../snapshots/snapshotEngine';
import { testKpi } from '../testFixtures';

const params = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

const snapshot: TeamSnapshot = {
  mode: 'team',
  persons: [
    {
      id: '1',
      bamboo: {
        id: '1',
        displayName: 'Anna',
        firstName: 'Anna',
        lastName: '',
        workEmail: 'anna@co.com',
        jobTitle: '',
        status: 'Active',
      },
      jira: { accountId: '1', displayName: 'Anna', email: 'anna@co.com', canonicalKey: '1' },
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: 'available', label: 'Available', isHoliday: false },
      workload: null,
      performance: null,
      issues: [
        {
          issueKey: 'THIS-WEEK',
          issueSummary: 'This week',
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
          currentStatus: 'Done',
          rangeEvents: [],
          events: [
            {
              eventType: 'Status',
              changedAt: '2026-03-03T10:00:00',
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
        },
      ],
    },
  ],
  summary: { available: 1, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
};

const reportData: AuditReportData = {
  grouped: {},
  totalTransitions: 0,
  teamSummaryColumns: [],
  teamKpi: testKpi({ completedCount: 99, firstPassAcceptedCount: 80 }),
  perUserKpi: {},
  params,
};

describe('weeklyDigest', () => {
  it('counts current-week backflow on active issue', () => {
    const activeSnapshot: TeamSnapshot = {
      ...snapshot,
      persons: [
        {
          ...snapshot.persons[0],
          issues: [
            {
              issueKey: 'ACTIVE-BF',
              issueSummary: 'Active backflow',
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
              currentStatus: 'In Progress',
              rangeEvents: [],
              events: [
                {
                  eventType: 'Status',
                  changedAt: '2026-03-03T10:00:00',
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
            },
          ],
        },
      ],
    };
    const digest = buildTeamWeeklyDigest(
      activeSnapshot,
      reportData,
      [],
      EMPTY_KPI_SNAPSHOT_FILE,
      'Team',
      new Date('2026-03-04T12:00:00'),
    );
    expect(digest).toContain('Backflows: 1');
    expect(digest).toContain('Completed: 0');
  });

  it('uses neutral Recent changes section title', () => {
    const digest = buildTeamWeeklyDigest(
      snapshot,
      reportData,
      [],
      EMPTY_KPI_SNAPSHOT_FILE,
      'Team',
      new Date('2026-03-04T12:00:00'),
    );
    expect(digest).toContain('Recent changes:');
    expect(digest).not.toContain('Positive changes:');
  });

  it('uses current-week completed count, not report range totals', () => {
    const digest = buildTeamWeeklyDigest(
      snapshot,
      reportData,
      [],
      EMPTY_KPI_SNAPSHOT_FILE,
      'Team',
      new Date('2026-03-04T12:00:00'),
    );
    expect(digest).toContain('Completed: 1');
    expect(digest).not.toContain('Completed: 99');
  });

  it('builds structured digest sections for UI', () => {
    const sections = buildTeamDigestSections(
      snapshot,
      reportData,
      [],
      EMPTY_KPI_SNAPSHOT_FILE,
      new Date('2026-03-04T12:00:00'),
    );
    expect(sections.map((s) => s.title)).toEqual(['This week', 'Attention', 'Recent changes']);
    expect(sections[0].rows.find((r) => r.label === 'Completed')?.value).toBe('1');
  });
});

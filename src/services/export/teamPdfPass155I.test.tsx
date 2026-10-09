import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { buildTeamPerformancePdfLayout } from './teamPerformancePdfModel';
import { TeamPerformancePdfDocument } from './TeamPerformancePdfDocument';
import { EMPTY_KPI_SNAPSHOT_FILE } from '../../domain/snapshots/snapshotEngine';
import type { TeamPerformanceSnapshot } from '../../domain/performance';
import type { TeamSnapshot } from '../../domain/people/types';
import type { AuditReportData } from '../../domain/jira/types';
import { testKpi, testWorkload } from '../../domain/testFixtures';
import { filterIndividualContributorPersons, buildCanonicalPersonPeriodKpis } from './teamPdfHelpers';
import { personActiveCount } from '../../domain/people/personDisplay';
import { filterOwnedIssues } from '../../domain/people/ownedIssues';
import type { Person } from '../../domain/people/types';

const reportRange = { from: '2026-07-09', to: '2026-10-09' };

const params = {
  dateFrom: reportRange.from,
  dateTo: reportRange.to,
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function activeIssue(key: string, assignee: string) {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: '2026-08-01T10:00:00.000Z',
    assigneeName: 'User',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: 'none',
    epicKey: 'none',
    epicSummary: 'none',
    epicStatus: 'none',
    epicContentType: 'none',
    epicDesignImprovementType: 'none',
    currentStatus: 'In Progress',
    currentAssigneeCanonical: assignee,
    events: [
      {
        eventType: 'Status' as const,
        changedAt: '2026-08-02T10:00:00.000Z',
        changedBy: 'User',
        fromValue: 'To Do',
        toValue: 'In Progress',
        timeSincePreviousStatusMs: null,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
    rangeEvents: [],
  };
}

function personFixture(
  id: string,
  name: string,
  email: string,
  jobTitle: string,
  supervisorId?: string,
  issues: ReturnType<typeof activeIssue>[] = [],
): Person {
  const canonical = email;
  const ownedIssues = filterOwnedIssues(issues, canonical);
  return {
    id,
    bamboo: {
      id,
      displayName: name,
      firstName: name.split(' ')[0] ?? name,
      lastName: name.split(' ')[1] ?? '',
      workEmail: email,
      jobTitle,
      department: 'UX Design',
      supervisorId,
      status: 'Active',
    },
    jira: { accountId: id, displayName: name, email, canonicalKey: canonical },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: testWorkload({ level: 'normal', activeCount: ownedIssues.length }),
    personalWorkload: testWorkload({ level: 'normal', activeCount: ownedIssues.length }),
    performance: testKpi({ efficiencyIndex: id === 'daria' ? 89 : 91, completedCount: 7, backflowCount: 1 }),
    issues,
    ownedIssues: [],
  };
}

describe('PASS 15.5I team PDF + workload', () => {
  it('excludes leads from individual efficiency using org graph direct reports', () => {
    const andrei = personFixture('andrei', 'Andrei Kuznetsov', 'andrei@co.com', 'Head of UX Design');
    const daria = personFixture('daria', 'Daria Chernova', 'daria@co.com', 'Product Designer', 'andrei');
    const valeriia = personFixture('valeriia', 'Valeriia Pavlova', 'valeriia@co.com', 'Designer', 'andrei');
    const nikita = personFixture('nikita', 'Nikita Example', 'nikita@co.com', 'Designer', 'andrei');

    const contributors = filterIndividualContributorPersons([andrei, daria, valeriia, nikita]);
    expect(contributors.map((p) => p.id).sort()).toEqual(['daria', 'nikita', 'valeriia']);
  });

  it('excludes nested lead and keeps designer A as contributor', () => {
    const andrei = personFixture('andrei', 'Andrei Kuznetsov', 'andrei@co.com', 'Head');
    const valeriia = personFixture('valeriia', 'Valeriia Pavlova', 'valeriia@co.com', 'Lead', 'andrei');
    const designer = personFixture('designer-a', 'Designer A', 'a@co.com', 'Designer', 'valeriia');
    const contributors = filterIndividualContributorPersons([andrei, valeriia, designer]);
    expect(contributors.map((p) => p.id)).toEqual(['designer-a']);
  });

  it('person KPI parity between PDF helper and Performance fields', () => {
    const daria = personFixture('daria', 'Daria Chernova', 'daria@co.com', 'Product Designer', 'andrei');
    const pdfKpis = buildCanonicalPersonPeriodKpis(daria);
    expect(pdfKpis.efficiency).toBe('89%');
    expect(pdfKpis.completed).toBe(String(daria.performance?.completedCount));
    expect(pdfKpis.backflows).toBe(String(daria.performance?.backflowCount));
  });

  it('active workload counts owned issues when ownedIssues array is empty', () => {
    const email = 'daria@co.com';
    const issues = [
      activeIssue('UX-1', email),
      activeIssue('UX-2', email),
      { ...activeIssue('UX-3', email), currentStatus: 'In Review' },
      { ...activeIssue('UX-4', email), currentStatus: 'In Review' },
      { ...activeIssue('UX-5', email), currentStatus: 'Backlog' },
      { ...activeIssue('UX-6', email), issueTypeName: 'Epic' },
    ];
    const daria = personFixture('daria', 'Daria', email, 'Designer', 'andrei', issues);
    expect(daria.ownedIssues).toEqual([]);
    const active = personActiveCount(daria, params);
    expect(active).toBe(2);
  });

  it('layout removes team attention and uses team name + efficiency hero', () => {
    const andrei = personFixture('andrei', 'Andrei Kuznetsov', 'andrei@co.com', 'Head of UX Design');
    const daria = personFixture('daria', 'Daria Chernova', 'daria@co.com', 'Product Designer', 'andrei');
    const teamSnapshot: TeamSnapshot = {
      mode: 'team',
      persons: [andrei, daria],
      summary: { available: 2, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
    };
    const teamOverview: TeamPerformanceSnapshot = {
      directReportIds: ['daria'],
      summary: [
        { label: 'Efficiency', value: '91%', status: 'Healthy', statusVariant: 'success' },
        { label: 'First pass', value: '84%', contextLabel: '+1.2 pp' },
        { label: 'Completed', value: '25', contextLabel: '-17' },
        { label: 'Backflows', value: '4', contextLabel: '-24' },
      ],
      attention: [],
      attentionTotalCount: 0,
      trends: [
        { label: 'Completed', value: '25', chartSeries: [{ date: '2026-07-09', value: 1 }, { date: '2026-10-09', value: 3 }] },
        { label: 'First pass', value: '84%', chartSeries: [{ date: '2026-07-09', value: 80 }, { date: '2026-10-09', value: 84 }] },
        { label: 'Avg cycle', value: '3.2d', chartSeries: [{ date: '2026-07-09', value: 4 }, { date: '2026-10-09', value: 3 }] },
        { label: 'Backflows', value: '4', chartSeries: [{ date: '2026-07-09', value: 2 }, { date: '2026-10-09', value: 4 }] },
      ],
      workload: [
        {
          personId: 'daria',
          personName: 'Daria Chernova',
          activeWork: 2,
          atRisk: 0,
          workload: 'Balanced',
          availability: 'Available',
          capacityDataState: 'measured',
        },
      ],
      timeOff: [],
      personDetails: {},
    };
    const reportData: AuditReportData = {
      params,
      grouped: {},
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: testKpi(),
      perUserKpi: {},
    };

    const layout = buildTeamPerformancePdfLayout({
      reportRange,
      teamOverview,
      teamSnapshot,
      reportData,
      kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
      companyLogoSrc: '',
      companyLogoSource: 'unavailable',
    });

    expect(layout.teamName).toBe('UX Design');
    expect(layout.teamEfficiency.hero.value).toBe('91%');
    expect(layout.individualEfficiency.map((c) => c.name)).toEqual(['Daria Chernova']);
    expect(layout.teamAttention).toBeUndefined();
    expect(layout.roster).toHaveLength(2);
    expect(layout.teamTrends).toHaveLength(4);
    expect(layout.workloadBalance.rows[0]?.active).toBe('2');
  });

  it('renders PDF with vector logo (not plain text wordmark)', async () => {
    const layout = buildTeamPerformancePdfLayout({
      reportRange,
      teamOverview: {
        directReportIds: [],
        summary: [{ label: 'Efficiency', value: '91%' }],
        attention: [],
        attentionTotalCount: 0,
        trends: [],
        workload: [],
        timeOff: [],
        personDetails: {},
      },
      teamSnapshot: {
        mode: 'team',
        persons: [personFixture('p1', 'Sam', 'sam@co.com', 'Designer')],
        summary: { available: 1, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
      },
      reportData: {
        params,
        grouped: {},
        totalTransitions: 0,
        teamSummaryColumns: [],
        teamKpi: testKpi(),
        perUserKpi: {},
      },
      kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
      companyLogoSrc: '',
      companyLogoSource: 'unavailable',
    });
    expect(layout.useVectorLogo).toBe(true);
    const buffer = await renderToBuffer(<TeamPerformancePdfDocument layout={layout} />);
    const text = buffer.toString('latin1');
    expect(text).not.toContain('TEAM ATTENTION');
    expect(buffer.byteLength).toBeGreaterThan(2000);
  });
});

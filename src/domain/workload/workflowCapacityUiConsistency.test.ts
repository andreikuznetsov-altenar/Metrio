import { describe, expect, it } from 'vitest';
import { capacityDistribution } from '../home/executiveDashboardModel';
import { CAPACITY_INSUFFICIENT_LABEL } from './capacityPresentation';
import { runWorkflowCapacityAudit } from '../workflows/workflowCapacityAudit';
import { buildPerformanceViewModels } from '../../services/performance/performanceViewModel';
import type { PerformanceFetchResult } from '../../services/performance/performanceTypes';
import type { Person, TeamSnapshot } from '../people/types';
import type { AuditIssue, AuditReportData } from '../jira/types';
import { filterOwnedIssues } from '../people/ownedIssues';
import { testKpi } from '../testFixtures';
import { calculateWorkload } from './workloadEngine';
import { EMPTY_KPI_SNAPSHOT_FILE } from '../snapshots/snapshotEngine';
import { createPerformanceDateRange } from '../performance/performanceDateRange';
import { resolvePerformanceReportRanges } from '../performance/reportParams';

const params: AuditReportData['params'] = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: ['914@co.com'],
  projects: ['MET'],
};

function bambooPerson(id: string, displayName: string, issues: AuditIssue[] = []): Person {
  const canonical = `jira-${id}`;
  const normalizedIssues = issues.map((issue) => ({
    ...issue,
    currentAssigneeCanonical: issue.currentAssigneeCanonical ?? canonical,
  }));
  const ownedIssues = filterOwnedIssues(normalizedIssues, canonical);
  const workload = calculateWorkload(ownedIssues, params);
  return {
    id,
    bamboo: {
      id,
      displayName,
      firstName: displayName.split(' ')[0] || displayName,
      lastName: displayName.split(' ')[1] || '',
      workEmail: `${id}@co.com`,
      jobTitle: 'Engineer',
      status: 'Active',
    },
    jira: {
      accountId: `jira-${id}`,
      displayName,
      email: `${id}@co.com`,
      canonicalKey: canonical,
    },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload,
    performance: testKpi({
      efficiencyIndex: 91,
      completedCount: 0,
      backflowCount: 0,
      firstPassAcceptedCount: 0,
    }),
    issues: normalizedIssues,
    ownedIssues,
  };
}

function activeIssue(key: string, summary: string, status = 'In Progress'): AuditIssue {
  return {
    issueKey: key,
    issueSummary: summary,
    issueCreated: '2026-01-01T00:00:00.000Z',
    assigneeName: 'Sam Dev',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events: [],
    rangeEvents: [],
    currentStatus: status,
  };
}

function buildResult(persons: Person[]): PerformanceFetchResult {
  const teamSnapshot: TeamSnapshot = {
    persons,
    mode: 'team',
    summary: {
      available: persons.length,
      onVacation: 0,
      vacationSoon: 0,
      highWorkload: 0,
      problematic: 0,
    },
  };
  const grouped: AuditReportData['grouped'] = {};
  for (const person of persons) {
    const key = person.jira?.canonicalKey || person.bamboo.workEmail || person.id;
    grouped[key] = { userLabel: person.bamboo.displayName, issues: person.ownedIssues };
  }
  const reportData: AuditReportData = {
    params,
    grouped,
    totalTransitions: 0,
    teamSummaryColumns: [],
    teamKpi: testKpi(),
    perUserKpi: {},
  };
  return {
    teamSnapshot,
    historyTeamSnapshot: teamSnapshot,
    reportData,
    historyReportData: reportData,
    kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
    reportParams: params,
    reportRanges: resolvePerformanceReportRanges(
      createPerformanceDateRange('30d'),
      'team',
      'team',
      3,
    ),
    identityResolution: [],
    timeOffEntries: [],
    partialWarnings: [],
    lastUpdatedAt: '2026-03-01T12:00:00.000Z',
    historicalBootstrapRan: false,
  };
}

describe('workflow capacity UI consistency', () => {
  it('matches audit insufficient_history with workload rows and distribution buckets', () => {
    const ic = bambooPerson('914', 'Sam Dev', [activeIssue('MET-142', 'Task without cycles')]);
    const data = buildResult([ic]);
    const audit = runWorkflowCapacityAudit(data.reportData!);
    expect(audit.personRows[0]?.capacityDataState).toBe('insufficient_history');

    const vm = buildPerformanceViewModels(data, '914');
    const row = vm.teamOverview?.workload[0];
    expect(row?.capacityDataState).toBe('insufficient_history');
    expect(row?.workload).toBe(CAPACITY_INSUFFICIENT_LABEL);
    expect(row?.workload).not.toBe('Light');

    const distribution = capacityDistribution(vm.teamOverview?.workload ?? []);
    const total = distribution.reduce((sum, bucket) => sum + bucket.count, 0);
    expect(total).toBe(1);
    expect(distribution.find((d) => d.label === CAPACITY_INSUFFICIENT_LABEL)?.count).toBe(1);
    expect(distribution.find((d) => d.label === 'Light')?.count).toBe(0);
  });
});

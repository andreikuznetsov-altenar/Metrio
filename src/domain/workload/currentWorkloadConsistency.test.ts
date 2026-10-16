import { describe, expect, it } from 'vitest';
import { buildPerformanceViewModels } from '../../services/performance/performanceViewModel';
import type { PerformanceFetchResult } from '../../services/performance/performanceTypes';
import { buildDashboardQueueRows } from '../actions/buildDashboardQueueRows';
import { buildTeamActions } from '../actions/buildTeamActions';
import { capacityDistribution } from '../home/executiveDashboardModel';
import type { AuditIssue, AuditReportData, IssueEvent, ReportParams } from '../jira/types';
import { assertUniqueCurrentOwnership, filterOwnedIssues } from '../people/ownedIssues';
import type { Person, TeamSnapshot } from '../people/types';
import { createPerformanceDateRange } from '../performance/performanceDateRange';
import { resolvePerformanceReportRanges } from '../performance/reportParams';
import { EMPTY_KPI_SNAPSHOT_FILE } from '../snapshots/snapshotEngine';
import { testKpi } from '../testFixtures';
import {
  capacityPresentationLabel,
  teamCapacityKpiFromRows,
} from './capacityPresentation';
import { buildTeamWorkloadDonutSegments } from './buildTeamWorkloadDonutSegments';
import { calculateWorkload } from './workloadEngine';

const NOW = new Date();
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

const params: ReportParams = {
  dateFrom: ago(90).slice(0, 10),
  dateTo: ago(0).slice(0, 10),
  targetReviewDays: 18,
  users: ['person-a@co.com'],
  projects: [],
};

function statusEvent(from: string, to: string, at: string): IssueEvent {
  return {
    eventType: 'Status',
    changedAt: at,
    changedBy: 'User',
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function touchEvent(at: string): IssueEvent {
  return { ...statusEvent('', '', at), eventType: 'Assignee' };
}

function baseIssue(key: string, status: string, owner: string, events: IssueEvent[]): AuditIssue {
  return {
    issueKey: key,
    projectKey: 'UX',
    issueSummary: key,
    issueCreated: ago(60),
    assigneeName: owner,
    currentAssigneeCanonical: owner,
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events,
    rangeEvents: [],
    currentStatus: status,
  };
}

/** A current task that entered `status` `daysInStage` ago and had activity `activityDaysAgo` ago. */
function current(
  key: string,
  status: string,
  owner = 'person-a',
  daysInStage = 1,
  activityDaysAgo = 1,
): AuditIssue {
  const events = [statusEvent('To Do', status, ago(daysInStage))];
  if (activityDaysAgo < daysInStage) events.push(touchEvent(ago(activityDaysAgo)));
  return baseIssue(key, status, owner, events);
}

/** A finished cycle of `workDays` calendar days that ended `endedDaysAgo` ago (historical only). */
function completed(key: string, owner: string, workDays: number, endedDaysAgo: number): AuditIssue {
  const end = endedDaysAgo;
  const start = end + workDays;
  return {
    ...baseIssue(key, 'Done', owner, [
      statusEvent('To Do', 'In Progress', ago(start)),
      statusEvent('In Progress', 'In Review', ago(end + 0.5)),
      statusEvent('In Review', 'Done', ago(end)),
    ]),
    issueCreated: ago(start + 1),
  };
}

/** Valeriia-shaped queue: 1 In Progress, 9 In Review, 3 On Hold, 1 To Do (14 unfinished). */
function representativeQueue(owner = 'person-a'): AuditIssue[] {
  return [
    current('Q-1', 'In Progress', owner),
    ...Array.from({ length: 9 }, (_, i) => current(`Q-R${i}`, 'In Review', owner, 2, 1)),
    ...Array.from({ length: 3 }, (_, i) => current(`Q-H${i}`, 'On Hold', owner, 1, 1)),
    current('Q-T', 'TODO', owner, 3, 3),
  ];
}

describe('current workload is derived from the current queue only', () => {
  it('representative queue (1 In Progress, 9 In Review, 3 On Hold, 1 To Do) is High - not Overloaded', () => {
    const result = calculateWorkload(representativeQueue(), params, undefined, undefined, { now: NOW });

    // The three On Hold tasks are "problematic" for delivery-risk purposes (health-wide count)...
    expect(result.problematicCount).toBe(3);
    // ...but On Hold is a low-weight waiting stage, not extra effort: it adds no load risk.
    expect(result.loadProblematicCount).toBe(0);
    expect(result.currentAssignedIssueCount).toBe(14);
    expect(result.activeWorkCount).toBe(1);
    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(6);
    expect(result.score).toBeLessThan(10);
  });

  it('exposes an exact per-issue breakdown that sums to the score', () => {
    const result = calculateWorkload(representativeQueue(), params, undefined, undefined, { now: NOW });
    const breakdown = result.scoreBreakdown ?? [];
    expect(breakdown).toHaveLength(14);

    const byKey = new Map(breakdown.map((item) => [item.issueKey, item]));
    expect(byKey.get('Q-1')).toMatchObject({ stage: 'active', stageScore: 1, riskScore: 0, total: 1 });
    expect(byKey.get('Q-R0')).toMatchObject({ stage: 'review', stageScore: 0.5, riskScore: 0, total: 0.5 });
    expect(byKey.get('Q-H0')).toMatchObject({ stage: 'hold', stageScore: 0.1, problematic: false, riskScore: 0, total: 0.1 });
    expect(byKey.get('Q-T')).toMatchObject({ stage: 'backlog', stageScore: 0.25, riskScore: 0, total: 0.25 });

    const sum = breakdown.reduce((acc, item) => acc + item.total, 0);
    expect(result.score).toBeCloseTo(sum, 1);
  });

  it('three genuinely problematic active-stage tasks still make a person Overloaded', () => {
    const stuck = [1, 2, 3].map((n) => current(`S-${n}`, 'In Review', 'person-a', 40, 1));
    const result = calculateWorkload(stuck, params, undefined, undefined, { now: NOW });
    expect(result.loadProblematicCount).toBe(3);
    expect(result.level).toBe('overloaded');
  });

  it('counts one issue once: "exceeds target" is a flavour of problematic, not a second penalty', () => {
    const [item] =
      calculateWorkload([current('S-1', 'In Review', 'person-a', 40, 1)], params, undefined, undefined, {
        now: NOW,
      }).scoreBreakdown ?? [];
    expect(item).toMatchObject({ problematic: true, overdue: true, riskScore: 2, stageScore: 0.5, total: 2.5 });
  });

  it('completed / terminal issues never affect current workload', () => {
    const base = calculateWorkload(representativeQueue(), params, undefined, undefined, { now: NOW });
    const withTerminal = calculateWorkload(
      [
        ...representativeQueue(),
        current('D-1', 'Done', 'person-a', 40, 1),
        current('D-2', 'Closed', 'person-a', 40, 1),
        current('D-3', 'Approved', 'person-a', 40, 1),
        current('D-4', 'Cancelled', 'person-a', 40, 1),
      ],
      params,
      undefined,
      undefined,
      { now: NOW },
    );
    expect(withTerminal.level).toBe(base.level);
    expect(withTerminal.score).toBe(base.score);
    expect(withTerminal.currentAssignedIssueCount).toBe(14);
    expect(withTerminal.scoreBreakdown?.map((i) => i.issueKey)).not.toContain('D-1');
  });

  it('historical capacity can change (even above 100%) without changing the current level', () => {
    const queue = [current('A-1', 'In Progress')];
    const lightHistory = calculateWorkload(queue, params, undefined, undefined, {
      now: NOW,
      capacityIssues: [...queue, completed('H-0', 'person-a', 2, 10)],
      capacitySubjectCanonical: 'person-a',
    });
    const heavyHistory = calculateWorkload(queue, params, undefined, undefined, {
      now: NOW,
      // One continuous, full-period cycle: ~every business hour of the 13-week window.
      capacityIssues: [...queue, completed('H-BIG', 'person-a', 120, 0.25)],
      capacitySubjectCanonical: 'person-a',
    });

    expect(heavyHistory.capacityLoadPercent!).toBeGreaterThan(100);
    expect(heavyHistory.capacityLoadPercent!).toBeGreaterThan(lightHistory.capacityLoadPercent!);
    expect(heavyHistory.level).toBe(lightHistory.level);
    expect(heavyHistory.score).toBe(lightHistory.score);
    expect(heavyHistory.level).toBe('low');
    // The single-task historical-duration case (UX-5444 shape) never becomes Overloaded.
    expect(heavyHistory.level).not.toBe('overloaded');
  });

  it('keeps assigned queue and active execution as separate counts', () => {
    const result = calculateWorkload(representativeQueue(), params, undefined, undefined, { now: NOW });
    expect(result.currentAssignedIssueCount).toBe(14);
    expect(result.activeWorkCount).toBe(1);
    expect(result.currentAssignedIssueCount).not.toBe(result.activeWorkCount);
    expect(result.reviewCount).toBe(9);
    expect(result.holdCount).toBe(3);
    expect(result.backlogCount).toBe(1);
  });

  it('an assignee change puts the issue in exactly one current queue', () => {
    const moved = current('M-1', 'In Review', 'daria');
    const shared = [moved, current('V-1', 'In Progress', 'valeriia')];
    expect(filterOwnedIssues(shared, 'valeriia').map((i) => i.issueKey)).toEqual(['V-1']);
    expect(filterOwnedIssues(shared, 'daria').map((i) => i.issueKey)).toEqual(['M-1']);
    const snapshot = {
      mode: 'team',
      summary: { available: 2, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
      persons: [
        { id: 'v', ownedIssues: filterOwnedIssues(shared, 'valeriia'), issues: shared },
        { id: 'd', ownedIssues: filterOwnedIssues(shared, 'daria'), issues: shared },
      ],
    } as unknown as TeamSnapshot;
    expect(() => assertUniqueCurrentOwnership(snapshot)).not.toThrow();
  });
});

describe('Team Actions copy', () => {
  function workloadAction(assigned: number, active: number) {
    return buildTeamActions({
      snapshot: {
        directReportIds: ['p'],
        summary: [],
        attention: [],
        attentionTotalCount: 0,
        trends: [],
        workload: [
          {
            personId: 'p',
            personName: 'Valeriia Pavlova',
            activeWork: active,
            assignedWork: assigned,
            atRisk: 0,
            workload: 'Overloaded',
            availability: 'Available',
          },
        ],
        timeOff: [],
        personDetails: {},
      },
      deliveryRisk: [],
    }).find((a) => a.kind === 'workload')!;
  }

  it('never calls the whole assigned queue "active" and uses correct singular/plural', () => {
    expect(workloadAction(14, 1).description).toBe('14 assigned tasks · 1 in progress');
    expect(workloadAction(1, 1).description).toBe('1 assigned task · 1 in progress');
    expect(workloadAction(3, 2).description).toBe('3 assigned tasks · 2 in progress');
  });

  it('the dashboard queue row shows both numbers and no "active tasks" claim', () => {
    const [row] = buildDashboardQueueRows([workloadAction(14, 1)]);
    expect(row!.contextLines).toEqual(['14 assigned tasks', '1 in progress']);
    expect(row!.contextLines.join(' ')).not.toMatch(/active tasks/);
  });
});

describe('every surface resolves the same current workload for the same person', () => {
  function person(id: string, name: string, owner: string, issues: AuditIssue[]): Person {
    const ownedIssues = filterOwnedIssues(issues, owner);
    return {
      id,
      bamboo: {
        id,
        displayName: name,
        firstName: name.split(' ')[0]!,
        lastName: name.split(' ')[1] ?? '',
        workEmail: `${id}@co.com`,
        jobTitle: 'Designer',
        status: 'Active',
      },
      jira: { accountId: owner, displayName: name, email: `${id}@co.com`, canonicalKey: owner },
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: 'available', label: 'Available', isHoliday: false },
      workload: calculateWorkload(ownedIssues, params, undefined, undefined, {
        now: NOW,
        capacityIssues: issues,
        capacitySubjectCanonical: owner,
      }),
      performance: testKpi({ efficiencyIndex: 90, completedCount: 0, backflowCount: 0, firstPassAcceptedCount: 0 }),
      issues,
      ownedIssues,
    };
  }

  it('People row, drawer, distribution, KPI, donut and presentation label agree (High / Heavy)', () => {
    // Heavy *historical* capacity must not leak into any of them either.
    const queue = representativeQueue('valeriia');
    const history = [completed('H-BIG', 'valeriia', 120, 0.25)];
    const p = person('v1', 'Valeriia Pavlova', 'valeriia', [...queue, ...history]);
    expect(p.workload!.capacityLoadPercent!).toBeGreaterThan(100);
    expect(p.workload!.level).toBe('high');

    const teamSnapshot: TeamSnapshot = {
      persons: [p],
      mode: 'team',
      summary: { available: 1, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
    };
    const reportData: AuditReportData = {
      params,
      grouped: { valeriia: { userLabel: 'Valeriia Pavlova', issues: p.ownedIssues } },
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: testKpi(),
      perUserKpi: {},
    };
    const data: PerformanceFetchResult = {
      teamSnapshot,
      historyTeamSnapshot: teamSnapshot,
      reportData,
      historyReportData: reportData,
      kpiSnapshots: EMPTY_KPI_SNAPSHOT_FILE,
      reportParams: params,
      reportRanges: resolvePerformanceReportRanges(createPerformanceDateRange('30d'), 'team', 'team', 3),
      identityResolution: [],
      timeOffEntries: [],
      partialWarnings: [],
      lastUpdatedAt: NOW.toISOString(),
      historicalBootstrapRan: false,
    };
    const vm = buildPerformanceViewModels(data, 'v1');
    const rows = vm.teamOverview!.workload;

    expect(rows[0]).toMatchObject({ workload: 'Heavy', assignedWork: 14, activeWork: 1 });
    expect(vm.teamOverview!.personDetails['v1']!.workload).toBe('Heavy');
    expect(capacityPresentationLabel(p.workload)).toBe('Heavy');
    expect(capacityDistribution(rows).find((d) => d.label === 'Heavy')?.count).toBe(1);
    expect(capacityDistribution(rows).find((d) => d.label === 'Overloaded')?.count).toBe(0);
    expect(teamCapacityKpiFromRows(rows)).toMatchObject({ value: '1', badgeLabel: '1 elevated' });
    expect(
      buildTeamWorkloadDonutSegments(rows, { personsById: new Map([[p.id, p]]) })[0]!.workloadLabel,
    ).toBe('Heavy');
    expect(buildTeamWorkloadDonutSegments(rows)[0]!.workloadLabel).toBe('Heavy');
  });
});

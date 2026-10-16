import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { buildKpiFromIssues } from '../jira/kpi';
import { getBusinessDurationMs } from '../jira/dates';

const PARAMS: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-01-31',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function status(fromValue: string, toValue: string, changedAt: string): IssueEvent {
  return {
    eventType: 'Status', changedAt, changedBy: 'test', fromValue, toValue,
    timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false,
    isReturnToTeam: false, excludeFromBackflow: false,
  };
}

function assignee(fromCanonical: string, toCanonical: string, changedAt: string): IssueEvent {
  return {
    eventType: 'Assignee', changedAt, changedBy: 'test', fromValue: fromCanonical,
    toValue: toCanonical, fromCanonical, toCanonical, timeSincePreviousStatusMs: null,
    isBackflow: false, isHandoff: false, isReturnToTeam: false,
    excludeFromBackflow: false,
  };
}

function issue(key: string, events: IssueEvent[], overrides: Partial<AuditIssue> = {}): AuditIssue {
  return {
    issueKey: key, issueSummary: key, issueCreated: '2026-01-01T09:00:00.000Z',
    assigneeName: 'Owner', issueTypeName: 'Task', contentType: 'none',
    designImprovementType: 'none', epicKey: 'none', epicSummary: 'none',
    epicStatus: 'none', epicContentType: 'none', epicDesignImprovementType: 'none',
    projectKey: 'UX', currentStatus: events.at(-1)?.toValue ?? 'To Do',
    currentAssigneeCanonical: 'alice', events, rangeEvents: events, ...overrides,
  };
}

describe('canonical performance methodology v2', () => {
  it('counts a started but unfinished cycle independently of completion', () => {
    const kpi = buildKpiFromIssues([
      issue('UX-1', [status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z')]),
    ], {}, PARAMS);
    expect(kpi.startedCount).toBe(1);
    expect(kpi.completedCount).toBe(0);
    expect(kpi.startedCount).not.toBe(kpi.completedCount);
  });

  it('counts three return events as one reworked cycle and three backflow events', () => {
    const events = [status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z')];
    for (let day = 6; day <= 8; day += 1) {
      events.push(status('In Progress', 'In Review', `2026-01-${String(day).padStart(2, '0')}T12:00:00.000Z`));
      events.push(status('In Review', 'In Progress', `2026-01-${String(day).padStart(2, '0')}T13:00:00.000Z`));
    }
    events.push(status('In Progress', 'In Review', '2026-01-09T12:00:00.000Z'));
    events.push(status('In Review', 'Done', '2026-01-09T15:00:00.000Z'));
    const kpi = buildKpiFromIssues([issue('UX-2', events)], {}, PARAMS);
    expect(kpi.completedCount).toBe(1);
    expect(kpi.reworkedCycleCount).toBe(1);
    expect(kpi.backflowEventCount).toBe(3);
    expect(kpi.firstPassAcceptedCount).toBe(0);
    expect((kpi.firstPassRatePercent ?? 0) + (kpi.reworkRatePercent ?? 0)).toBe(100);
  });

  it('does not treat hold or externally controlled approval waiting as rework', () => {
    const hold = issue('UX-3', [
      status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      status('In Progress', 'On Hold', '2026-01-05T12:00:00.000Z'),
      status('On Hold', 'In Progress', '2026-01-06T09:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-06T12:00:00.000Z'),
    ]);
    const approval = issue('CIT-1', [
      status('Open', 'In Progress', '2026-01-05T09:00:00.000Z'),
      status('In Progress', 'Awaiting approval', '2026-01-05T12:00:00.000Z'),
      status('Awaiting approval', 'In Progress', '2026-01-06T09:00:00.000Z'),
      status('In Progress', 'Delivered', '2026-01-06T12:00:00.000Z'),
    ], { projectKey: 'CIT', issueTypeName: 'Purchase Request' });
    const kpi = buildKpiFromIssues([hold, approval], {}, PARAMS);
    expect(kpi.backflowEventCount).toBe(0);
    expect(kpi.firstPassAcceptedCount).toBe(2);
  });

  it('treats actual review to active as rework and cancellation as not completed', () => {
    const returned = issue('UX-4', [
      status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      status('In Progress', 'In Review', '2026-01-05T12:00:00.000Z'),
      status('In Review', 'In Progress', '2026-01-06T09:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-06T12:00:00.000Z'),
    ]);
    const cancelled = issue('UX-5', [
      status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      status('In Progress', 'Cancelled', '2026-01-06T12:00:00.000Z'),
    ]);
    const kpi = buildKpiFromIssues([returned, cancelled], {}, PARAMS);
    expect(kpi.completedCount).toBe(1);
    expect(kpi.reworkedCycleCount).toBe(1);
  });

  it('handles reopen and recompletion as two deterministic completion cycles', () => {
    const kpi = buildKpiFromIssues([issue('UX-6', [
      status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-05T12:00:00.000Z'),
      status('Done', 'In Progress', '2026-01-06T09:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-06T12:00:00.000Z'),
    ])], {}, PARAMS);
    expect(kpi.startedCount).toBe(2);
    expect(kpi.completedCount).toBe(2);
    expect(kpi.firstPassAcceptedCount).toBe(2);
  });

  it('uses the median for long-tailed duration samples and aggregates raw samples', () => {
    const samples = [
      ['2026-01-05T09:00:00.000Z', '2026-01-05T10:00:00.000Z'],
      ['2026-01-06T09:00:00.000Z', '2026-01-06T11:00:00.000Z'],
      ['2026-01-07T09:00:00.000Z', '2026-01-23T13:00:00.000Z'],
    ];
    const durations = samples.map(([start, end], index) => issue(`UX-M${index}`, [
      status('To Do', 'In Progress', start),
      status('In Progress', 'Done', end),
    ]));
    // Long sample crosses business days; it stays an outlier but cannot drag the median.
    const kpi = buildKpiFromIssues(durations, {}, PARAMS);
    expect(kpi.executionSampleCount).toBe(3);
    expect(kpi.medianExecutionMs).toBe(2 * 3600000);
    expect(kpi.meanExecutionMs).not.toBe(kpi.medianExecutionMs);
  });

  it('deduplicates team issues and never averages profile averages', () => {
    const shared = issue('UX-7', [
      status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-05T10:00:00.000Z'),
    ]);
    const long = issue('AGP-1', [
      status('New', 'In Progress', '2026-01-06T09:00:00.000Z'),
      status('In Progress', 'Closed', '2026-01-06T17:00:00.000Z'),
    ], { projectKey: 'AGP', issueTypeName: 'Story' });
    const kpi = buildKpiFromIssues([shared, shared, long], {}, PARAMS);
    expect(kpi.completedCount).toBe(2);
    const expectedMean = Math.round((
      (getBusinessDurationMs('2026-01-05T09:00:00.000Z', '2026-01-05T10:00:00.000Z') ?? 0) +
      (getBusinessDurationMs('2026-01-06T09:00:00.000Z', '2026-01-06T17:00:00.000Z') ?? 0)
    ) / 2);
    expect(kpi.meanExecutionMs).toBe(expectedMean);
  });

  it('attributes execution segments and the completion cycle to actual owners', () => {
    const changed = issue('UX-8', [
      status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      assignee('alice', 'bob', '2026-01-05T11:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-05T17:00:00.000Z'),
    ], { currentAssigneeCanonical: 'bob' });
    const alice = buildKpiFromIssues([changed], {}, PARAMS, { contributorCanonical: 'alice' });
    const bob = buildKpiFromIssues([changed], {}, PARAMS, { contributorCanonical: 'bob' });
    expect(alice.startedCount).toBe(1);
    expect(alice.completedCount).toBe(0);
    expect(bob.completedCount).toBe(1);
    expect(bob.medianExecutionMs).toBe(
      getBusinessDurationMs('2026-01-05T11:00:00.000Z', '2026-01-05T17:00:00.000Z'),
    );
  });

  it('reconciles person totals to the team total (completed, first pass, reworked cycles; events separately)', () => {
    const rework = [status('To Do', 'In Progress', '2026-01-05T09:00:00.000Z')];
    for (let day = 6; day <= 8; day += 1) {
      const d = String(day).padStart(2, '0');
      rework.push(status('In Progress', 'In Review', `2026-01-${d}T12:00:00.000Z`));
      rework.push(status('In Review', 'In Progress', `2026-01-${d}T13:00:00.000Z`));
    }
    rework.push(status('In Progress', 'In Review', '2026-01-09T12:00:00.000Z'));
    rework.push(status('In Review', 'Done', '2026-01-09T15:00:00.000Z'));
    const aliceRework = issue('UX-20', rework); // 1 reworked cycle, 3 events, owner alice
    const aliceClean = issue('UX-21', [
      status('To Do', 'In Progress', '2026-01-12T09:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-12T12:00:00.000Z'),
    ]);
    const bobClean = issue('UX-22', [
      status('To Do', 'In Progress', '2026-01-13T09:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-13T16:00:00.000Z'),
    ], { currentAssigneeCanonical: 'bob' });
    // Reassigned mid-cycle: bob owns the larger execution segment and the completion.
    const handedOver = issue('UX-23', [
      status('To Do', 'In Progress', '2026-01-14T09:00:00.000Z'),
      assignee('alice', 'bob', '2026-01-14T10:00:00.000Z'),
      status('In Progress', 'Done', '2026-01-14T17:00:00.000Z'),
    ], { currentAssigneeCanonical: 'bob' });
    const all = [aliceRework, aliceClean, bobClean, handedOver];

    const team = buildKpiFromIssues(all, {}, PARAMS);
    const alice = buildKpiFromIssues(all, {}, PARAMS, { contributorCanonical: 'alice' });
    const bob = buildKpiFromIssues(all, {}, PARAMS, { contributorCanonical: 'bob' });

    expect(team.completedCount).toBe(4);
    expect(alice.completedCount + bob.completedCount).toBe(team.completedCount);
    expect(alice.firstPassAcceptedCount + bob.firstPassAcceptedCount).toBe(team.firstPassAcceptedCount);
    expect(alice.reworkedCycleCount + bob.reworkedCycleCount).toBe(team.reworkedCycleCount);
    expect(team.reworkedCycleCount).toBe(1);
    // Events reconcile on their own axis and are never conflated with reworked cycles.
    expect(alice.backflowEventCount + bob.backflowEventCount).toBe(team.backflowEventCount);
    expect(team.backflowEventCount).toBe(3);
    expect(team.backflowEventCount).not.toBe(team.reworkedCycleCount);
    // The hand-over cycle is credited once, to the owner of the larger execution segment.
    expect(alice.completedCount).toBe(2);
    expect(bob.completedCount).toBe(2);
  });

  it('retains intentional WSkins completion and return semantics', () => {
    const main = issue('WS-1', [
      status('Not started WS', 'In Progress', '2026-01-05T09:00:00.000Z'),
      status('In Progress', 'Internal Review', '2026-01-05T12:00:00.000Z'),
      status('Internal Review', 'In Progress', '2026-01-06T09:00:00.000Z'),
      status('In Progress', 'Internal Review', '2026-01-06T12:00:00.000Z'),
    ], { projectKey: 'WS', issueTypeName: 'Skin' });
    const kpi = buildKpiFromIssues([main], {}, PARAMS);
    expect(kpi.completedCount).toBe(2);
    expect(kpi.backflowEventCount).toBe(1);
    expect(kpi.reworkedCycleCount).toBe(1);
  });
});

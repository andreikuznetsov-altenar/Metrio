import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { calculateWorkload } from '../workload/workloadEngine';
import {
  calculateCapacityBreakdown,
  capacityLevelFromPercent,
  daysInReportingPeriod,
  MONTHLY_CAPACITY_HOURS,
} from './capacityWorkload';
import { extractProfileContributorCycles } from './profileCycles';
import { getProfileById } from './profileRegistry';

const HOUR = 60 * 60 * 1000;

const params: ReportParams = {
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  targetReviewDays: 30,
  users: [],
  projects: [],
};

function statusEvent(from: string, to: string, at: string, isBackflow = false): IssueEvent {
  return {
    eventType: 'Status',
    changedAt: at,
    changedBy: 'User',
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromBackflow: false,
  };
}

function assigneeEvent(
  from: string,
  to: string,
  fromCanonical: string | undefined,
  toCanonical: string | undefined,
  at: string,
): IssueEvent {
  return {
    eventType: 'Assignee',
    changedAt: at,
    changedBy: 'Lead',
    fromValue: from,
    toValue: to,
    fromCanonical,
    toCanonical,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromBackflow: false,
  };
}

function uxIssue(
  key: string,
  events: IssueEvent[],
  status: string,
  currentAssigneeCanonical = 'valeria',
  issueCreated = '2025-01-02T09:00:00',
): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated,
    assigneeName: currentAssigneeCanonical === 'valeria' ? 'Valeriia Pavlova' : 'User',
    currentAssigneeCanonical,
    currentAssigneeDisplayName:
      currentAssigneeCanonical === 'valeria' ? 'Valeriia Pavlova' : 'User',
    projectKey: 'UX',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: 'none',
    epicKey: 'none',
    epicSummary: 'none',
    epicStatus: 'none',
    epicContentType: 'none',
    epicDesignImprovementType: 'none',
    events,
    rangeEvents: [],
    currentStatus: status,
  };
}

describe('capacityWorkload', () => {
  it('keeps the monthly historical-capacity extrapolation mathematically stable', () => {
    const days = daysInReportingPeriod(params);
    expect(days).toBe(31);

    const completedCycles = 4;
    const avgHours = 20;
    const monthlyQty = (completedCycles / days) * 30;
    const hours = monthlyQty * avgHours;
    const loadPercent = (hours / MONTHLY_CAPACITY_HOURS) * 100;

    expect(monthlyQty).toBeCloseTo((4 / 31) * 30, 5);
    expect(hours).toBeCloseTo(monthlyQty * 20, 5);
    expect(loadPercent).toBeCloseTo((hours / 164) * 100, 1);
  });

  it('derives effort-based current workload even without completed history', () => {
    const activeOnly = Array.from({ length: 12 }, (_, i) =>
      uxIssue(`UX-${i}`, [], 'In Progress'),
    );
    const result = calculateWorkload(activeOnly, params);

    expect(result.capacityDataState).toBe('insufficient_history');
    expect(result.activeCount).toBe(12);
    expect(result.score).toBe(30);
    expect(result.expectedEffortHours).toBe(24);
    expect(result.level).toBe('low');
  });

  it('derives historical capacity labels from capacity percent thresholds', () => {
    expect(capacityLevelFromPercent(40)).toBe('low');
    expect(capacityLevelFromPercent(60)).toBe('normal');
    expect(capacityLevelFromPercent(90)).toBe('high');
    expect(capacityLevelFromPercent(110)).toBe('overloaded');
  });

  it('aggregates mixed project cycles with profile-aware extraction', () => {
    const ux = uxIssue(
      'UX-1',
      [
        statusEvent('To Do', 'In Progress', '2025-01-03T09:00:00'),
        statusEvent('In Progress', 'In Review', '2025-01-03T17:00:00'),
        statusEvent('In Review', 'Approved', '2025-01-04T09:00:00'),
      ],
      'Approved',
    );
    const wskinsProfile = getProfileById('wskins_skin')!;
    const ws = uxIssue(
      'WS-1',
      [
        statusEvent('Not started WS', 'In Progress', '2025-01-05T09:00:00'),
        statusEvent('In Progress', 'Internal Review', '2025-01-05T15:00:00'),
      ],
      'Internal Review',
    );
    ws.projectKey = 'WS';
    ws.issueTypeName = 'Skin';

    const uxCycles = extractProfileContributorCycles(ux, getProfileById('ux')!, params);
    const wsCycles = extractProfileContributorCycles(ws, wskinsProfile, params);
    expect(uxCycles.length).toBe(1);
    expect(wsCycles.length).toBe(1);

    const workload = calculateWorkload([ux, ws], params);
    // WS cycle occurred on a weekend and therefore has no execution duration;
    // it is not a valid capacity sample.
    expect(workload.capacityBreakdown?.completedCyclesInPeriod).toBe(1);
    expect(workload.monthlyCapacityHours).toBe(164);
  });

  it('UX-5444 regression: a long historical cycle cannot make one current task Overloaded', () => {
    const issue = uxIssue(
      'UX-5444',
      [
        statusEvent('To Do', 'In Progress', '2025-01-02T09:00:00'),
        statusEvent('In Progress', 'In Review', '2025-01-24T17:00:00'),
        statusEvent('In Review', 'Approved', '2025-01-27T10:00:00'),
        statusEvent('Approved', 'In Progress', '2025-01-31T09:00:00'),
      ],
      'In Progress',
      'valeria',
      '2025-01-01T09:00:00',
    );

    const result = calculateWorkload([issue], params, undefined, undefined, {
      now: new Date('2025-01-31T10:00:00'),
    });

    expect(result.currentAssignedIssueCount).toBe(1);
    expect(result.activeWorkCount).toBe(1);
    expect(result.level).toBe('low');
    expect(result.score).toBeGreaterThan(0);
    expect(result.capacityBreakdown?.completedCycleHours).toBeGreaterThan(0);
  });

  it('UX-5719 regression: attributes contributor time only to the actual assignee periods', () => {
    const september: ReportParams = {
      ...params,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    };
    const issue = uxIssue(
      'UX-5719',
      [
        statusEvent('To Do', 'In Progress', '2026-09-01T09:00:00'),
        assigneeEvent(
          'Valeriia Pavlova',
          'Daria Chernova',
          'valeria',
          'daria',
          '2026-09-07T09:00:00',
        ),
        assigneeEvent(
          'Daria Chernova',
          'Valeriia Pavlova',
          'daria',
          'valeria',
          '2026-09-15T09:00:00',
        ),
        statusEvent('In Progress', 'In Review', '2026-09-21T17:00:00'),
        statusEvent('In Review', 'Approved', '2026-09-22T10:00:00'),
      ],
      'Approved',
      'valeria',
      '2026-08-31T09:00:00',
    );

    const valeriia = calculateCapacityBreakdown({
      issues: [issue],
      params: september,
      now: new Date('2026-09-30T12:00:00'),
      subjectCanonical: 'valeria',
    });
    const daria = calculateCapacityBreakdown({
      issues: [issue],
      params: september,
      now: new Date('2026-09-30T12:00:00'),
      subjectCanonical: 'daria',
    });

    // Full In Progress elapsed-business time is 120h. Daria owned 48h of it,
    // so Valeriia receives only the remaining 72h and Daria keeps her 48h.
    expect(valeriia.completedCyclesInPeriod).toBe(1);
    expect(valeriia.completedCycleHours).toBe(72);
    expect(daria.completedCyclesInPeriod).toBe(1);
    expect(daria.completedCycleHours).toBe(48);
    expect(valeriia.completedCycleHours + daria.completedCycleHours).toBe(120);
  });

  it('does not double-count parallel contributor intervals for the same person', () => {
    const january2026: ReportParams = {
      ...params,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    };
    const makeParallel = (key: string) =>
      uxIssue(
        key,
        [
          statusEvent('To Do', 'In Progress', '2026-01-05T09:00:00'),
          statusEvent('In Progress', 'In Review', '2026-01-05T17:00:00'),
          statusEvent('In Review', 'Approved', '2026-01-06T10:00:00'),
        ],
        'Approved',
        'valeria',
        '2026-01-05T08:00:00',
      );

    const breakdown = calculateCapacityBreakdown({
      issues: [makeParallel('UX-P1'), makeParallel('UX-P2')],
      params: january2026,
      now: new Date('2026-01-31T12:00:00'),
    });

    expect(breakdown.completedCyclesInPeriod).toBe(2);
    expect(breakdown.completedCycleHours * HOUR).toBe(8 * HOUR);
    expect(breakdown.completedCycleHours).toBe(8);
  });

  it('counts Valeriia current queue separately from the one In Progress task', () => {
    const issues = [
      uxIssue('UX-IP', [], 'In Progress', 'valeria', '2025-01-30T09:00:00'),
      ...Array.from({ length: 9 }, (_, i) =>
        uxIssue(`UX-R-${i}`, [], 'In Review', 'valeria', '2025-01-30T09:00:00'),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        uxIssue(`UX-H-${i}`, [], 'On Hold', 'valeria', '2025-01-30T09:00:00'),
      ),
      uxIssue('UX-TODO', [], 'To Do', 'valeria', '2025-01-30T09:00:00'),
    ];

    const result = calculateWorkload(issues, params);

    expect(result.currentAssignedIssueCount).toBe(14);
    expect(result.activeWorkCount).toBe(1);
    expect(result.reviewCount).toBe(9);
    expect(result.holdCount).toBe(3);
    expect(result.backlogCount).toBe(1);
    expect(result.level).toBe('low');
    expect(result.level).not.toBe('overloaded');
  });
});

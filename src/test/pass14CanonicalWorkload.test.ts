import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../domain/jira/types';
import { filterOwnedIssues } from '../domain/people/ownedIssues';
import { classifyIssueAttention } from '../domain/radar/taskSignals';
import { calculateWorkload } from '../domain/workload/workloadEngine';
import { getActiveCapacitySegmentMs } from '../domain/workflows/profileCycles';
import { resolveWorkflowProfile } from '../domain/workflows/resolveWorkflowProfile';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-01-31',
  targetReviewDays: 3,
  users: [],
  projects: ['UX'],
};

function event(fromValue: string, toValue: string, changedAt: string): IssueEvent {
  return {
    eventType: 'Status',
    changedAt,
    changedBy: 'User',
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function issue(
  key: string,
  status: string,
  events: IssueEvent[] = [],
  owner = 'person-b',
): AuditIssue {
  return {
    issueKey: key,
    projectKey: 'UX',
    issueSummary: key,
    issueCreated: '2026-01-05T09:00:00.000Z',
    assigneeName: owner,
    currentAssigneeCanonical: owner,
    issueTypeName: 'Task',
    contentType: '',
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

describe('PASS14 canonical workload', () => {
  it('classifies current operational buckets without contradictions', () => {
    const result = calculateWorkload(
      [
        issue('UX-1', 'In Progress'),
        issue('UX-2', 'In Review'),
        issue('UX-3', 'On Hold'),
        issue('UX-4', 'Waiting for dependency'),
        issue('UX-5', 'To Do'),
        issue('UX-6', 'Done'),
        issue('UX-7', 'Corporate Mystery Gate'),
      ],
      params,
    );
    expect(result.activeWorkCount).toBe(1);
    expect(result.reviewCount).toBe(1);
    expect(result.holdCount).toBe(1);
    expect(result.waitingCount).toBe(1);
    expect(result.backlogCount).toBe(1);
    expect(result.unknownCount).toBe(1);
    expect(result.capacityContributorIssueCount).toBe(1);
    expect(result.activeCount).toBe(1);
  });

  it('ten review tasks do not create execution overload', () => {
    const reviews = Array.from({ length: 10 }, (_, index) =>
      issue(`UX-R${index}`, 'In Review'),
    );
    const result = calculateWorkload(reviews, params);
    expect(result.activeWorkCount).toBe(0);
    expect(result.reviewCount).toBe(10);
    expect(result.capacityContributorIssueCount).toBe(0);
    expect(result.capacityLoadPercent).toBe(0);
    expect(result.level).not.toBe('overloaded');
  });

  it('uses only active intervals: 2 active days + 12 review days', () => {
    const completed = issue('UX-20', 'Done', [
      event('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      event('In Progress', 'In Review', '2026-01-07T09:00:00.000Z'),
      event('In Review', 'Done', '2026-01-19T09:00:00.000Z'),
    ]);
    const result = calculateWorkload([completed], params);
    expect(result.capacityBreakdown?.completedCycleHours).toBeCloseTo(48, 4);
    expect(result.capacityBreakdown?.avgHoursPerCycle).toBeCloseTo(48, 4);
  });

  it.each([
    ['In Review', 0],
    ['On Hold', 0],
    ['Waiting for dependency', 0],
  ])('%s current segment contributes %s execution capacity', (status, expected) => {
    const item = issue(`UX-${status}`, status, [
      event('To Do', status, '2026-01-05T09:00:00.000Z'),
    ]);
    const ms = getActiveCapacitySegmentMs(
      item,
      resolveWorkflowProfile(item),
      '2026-01-15T09:00:00.000Z',
    );
    expect(ms).toBe(expected);
  });

  it('current active segment contributes its working duration', () => {
    const active = issue('UX-30', 'In Progress', [
      event('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
    ]);
    const ms = getActiveCapacitySegmentMs(
      active,
      resolveWorkflowProfile(active),
      '2026-01-08T09:00:00.000Z',
    );
    expect(ms / 86400000).toBeCloseTo(3, 4);
  });

  it('backflow capacity includes only active contributor segments', () => {
    const completed = issue('UX-40', 'Done', [
      event('To Do', 'In Progress', '2026-01-05T09:00:00.000Z'),
      event('In Progress', 'In Review', '2026-01-07T09:00:00.000Z'),
      event('In Review', 'In Progress', '2026-01-19T09:00:00.000Z'),
      event('In Progress', 'In Review', '2026-01-20T09:00:00.000Z'),
      event('In Review', 'Done', '2026-01-21T09:00:00.000Z'),
    ]);
    const result = calculateWorkload([completed], params);
    expect(result.capacityBreakdown?.completedCycleHours).toBeCloseTo(72, 4);
  });

  it('keeps only current owner after reassignment while history may remain', () => {
    const reassigned = issue('UX-100', 'In Progress', [], 'person-b');
    expect(filterOwnedIssues([reassigned], 'person-a')).toEqual([]);
    expect(filterOwnedIssues([reassigned], 'person-b')).toEqual([reassigned]);
  });

  it('deduplicates repeated linked issue input in personal workload', () => {
    const duplicate = issue('UX-200', 'In Progress');
    const result = calculateWorkload([duplicate, duplicate], params);
    expect(result.activeWorkCount).toBe(1);
    expect(result.currentAssignedIssueCount).toBe(1);
  });

  it('long review remains attention eligible but not execution active', () => {
    const review = issue('UX-300', 'In Review', [
      event('In Progress', 'In Review', '2026-01-05T09:00:00.000Z'),
    ]);
    const result = calculateWorkload([review], params, undefined, undefined, {
      now: new Date('2026-01-15T09:00:00.000Z'),
    });
    const attention = classifyIssueAttention(
      review,
      params,
      new Date('2026-01-15T09:00:00.000Z'),
    );
    expect(result.activeWorkCount).toBe(0);
    expect(result.reviewCount).toBe(1);
    expect(attention).not.toBeNull();
    expect(attention?.reason).toMatch(/exceeds|Review|activity/i);
  });

  it('manager personal workload contains only the manager-owned issue set', () => {
    const managerIssue = issue('UX-M1', 'In Progress', [], 'manager');
    const reportIssue = issue('UX-I1', 'In Progress', [], 'report');
    const managerOwned = filterOwnedIssues([managerIssue, reportIssue], 'manager');
    const result = calculateWorkload(managerOwned, params);
    expect(managerOwned.map((item) => item.issueKey)).toEqual(['UX-M1']);
    expect(result.activeWorkCount).toBe(1);
  });
});

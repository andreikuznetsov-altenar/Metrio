import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../domain/jira/types';
import { calculateWorkload } from '../domain/workload/workloadEngine';

const params: ReportParams = {
  dateFrom: '2026-07-09',
  dateTo: '2026-10-09',
  targetReviewDays: 18,
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
): AuditIssue {
  return {
    issueKey: key,
    projectKey: 'UX',
    issueSummary: key,
    issueCreated: '2026-01-05T09:00:00.000Z',
    assigneeName: 'Person A',
    currentAssigneeCanonical: 'person-a',
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

describe('PASS 15.5M current operational workload', () => {
  it('Person A: no capacity contributors → Active 0, load 0, not overloaded', () => {
    const completedOnly = issue('UX-HIST', 'Done', [
      event('To Do', 'In Progress', '2026-08-01T09:00:00.000Z'),
      event('In Progress', 'In Review', '2026-08-03T09:00:00.000Z'),
      event('In Review', 'Done', '2026-08-05T09:00:00.000Z'),
    ]);
    const result = calculateWorkload([completedOnly], params);
    expect(result.activeWorkCount).toBe(0);
    expect(result.capacityContributorIssueCount).toBe(0);
    expect(result.capacityLoadPercent).toBe(0);
    expect(result.level).not.toBe('overloaded');
    expect(result.level).not.toBe('high');
  });

  it('Person B: two active contributor issues → Active 2 and positive load', () => {
    const active = [
      issue('UX-A1', 'In Progress'),
      issue('UX-A2', 'In Progress'),
    ];
    const result = calculateWorkload(active, params);
    expect(result.activeWorkCount).toBe(2);
    expect(result.capacityContributorIssueCount).toBe(2);
  });

  it('Person C: review-only issues → not falsely overloaded', () => {
    const reviews = [issue('UX-R1', 'In Review'), issue('UX-R2', 'In Review')];
    const result = calculateWorkload(reviews, params);
    expect(result.activeWorkCount).toBe(0);
    expect(result.reviewCount).toBe(2);
    expect(result.capacityContributorIssueCount).toBe(0);
    expect(result.capacityLoadPercent).toBe(0);
    expect(result.level).not.toBe('overloaded');
  });
});

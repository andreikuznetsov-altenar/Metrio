import { describe, expect, it } from 'vitest';
import { buildKpiFromIssues } from './kpi';
import type { AuditIssue } from './types';

function statusEvent(changedAt: string, fromValue: string, toValue: string) {
  return {
    eventType: 'Status' as const,
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

function issueWithCompletion(completedAt: string): AuditIssue {
  const events = [
    statusEvent('2024-01-02T09:00:00.000Z', 'To Do', 'In Progress'),
    statusEvent('2024-01-03T09:00:00.000Z', 'In Progress', 'Review'),
    statusEvent(completedAt, 'Review', 'Done'),
  ];
  return {
    issueKey: 'TEST-1',
    issueSummary: 'Test',
    issueCreated: '2024-01-01T10:00:00.000Z',
    assigneeName: 'User',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: 'none',
    epicKey: 'none',
    epicSummary: 'none',
    epicStatus: 'none',
    epicContentType: 'none',
    epicDesignImprovementType: 'none',
    currentStatus: 'Done',
    events,
    rangeEvents: events,
  };
}

describe('buildKpiFromIssues period filtering', () => {
  it('counts only cycles completed inside the selected reporting window', () => {
    const issue = {
      ...issueWithCompletion('2024-01-04T09:00:00.000Z'),
      issueKey: 'JAN',
    };
    const issueFebruary = {
      ...issueWithCompletion('2024-02-04T09:00:00.000Z'),
      issueKey: 'FEB',
    };

    const januaryKpi = buildKpiFromIssues([issue, issueFebruary], {}, {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      targetReviewDays: 3,
      users: ['user'],
      projects: [],
    });

    const februaryKpi = buildKpiFromIssues([issue, issueFebruary], {}, {
      dateFrom: '2024-02-01',
      dateTo: '2024-02-29',
      targetReviewDays: 3,
      users: ['user'],
      projects: [],
    });

    expect(januaryKpi.completedCount).toBe(1);
    expect(februaryKpi.completedCount).toBe(1);

    const bothMonths = buildKpiFromIssues([issue, issueFebruary], {}, {
      dateFrom: '2024-01-01',
      dateTo: '2024-02-29',
      targetReviewDays: 3,
      users: ['user'],
      projects: [],
    });
    expect(bothMonths.completedCount).toBe(2);
  });

  it('reconstructs cycles from full history when completion crosses range start', () => {
    const issue = issueWithCompletion('2024-01-15T09:00:00.000Z');
    const kpi = buildKpiFromIssues([issue], {}, {
      dateFrom: '2024-01-10',
      dateTo: '2024-01-31',
      targetReviewDays: 3,
      users: ['user'],
      projects: [],
    });
    expect(kpi.completedCount).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { buildKpiFromIssues } from './kpi';
import type { AuditIssue } from './types';

describe('buildKpiFromIssues', () => {
  it('counts completed cycles from fixture events', () => {
    const statusEvents = [
      {
        eventType: 'Status' as const,
        changedAt: '2024-01-02T09:00:00.000Z',
        changedBy: 'User',
        fromValue: 'To Do',
        toValue: 'In Progress',
        timeSincePreviousStatusMs: null,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromBackflow: false,
      },
      {
        eventType: 'Status' as const,
        changedAt: '2024-01-03T09:00:00.000Z',
        changedBy: 'User',
        fromValue: 'In Progress',
        toValue: 'Review',
        timeSincePreviousStatusMs: 28800000,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromBackflow: false,
      },
      {
        eventType: 'Status' as const,
        changedAt: '2024-01-04T09:00:00.000Z',
        changedBy: 'User',
        fromValue: 'Review',
        toValue: 'Done',
        timeSincePreviousStatusMs: 28800000,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromBackflow: false,
      },
    ];

    const issue: AuditIssue = {
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
      events: statusEvents,
      rangeEvents: statusEvents,
    };

    const kpi = buildKpiFromIssues([issue], {}, {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      targetReviewDays: 3,
      users: ['user'],
      projects: [],
    });

    expect(kpi.completedCount).toBe(1);
    expect(kpi.firstPassAcceptedCount).toBe(1);
    expect(kpi.reworkedCycleCount).toBe(0);
    expect(kpi.backflowEventCount).toBe(0);
  });
});

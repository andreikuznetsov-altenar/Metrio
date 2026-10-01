import { describe, expect, it } from 'vitest';
import { calculateEfficiencyIndex, getEfficiencyStatus, buildKpiFromIssues } from './kpi';
import type { AuditIssue } from './types';

describe('calculateEfficiencyIndex', () => {
  it('returns 0 when no started or completed cycles', () => {
    expect(
      calculateEfficiencyIndex({
        startedCount: 0,
        completedCount: 0,
        firstPassAcceptedCount: 0,
        backflowCount: 0,
        avgProgressToReviewMs: null,
        targetReviewDays: 3,
      }),
    ).toBe(0);
  });

  it('matches legacy scoring bands for speed', () => {
    const targetReviewDays = 3;
    const targetMs = targetReviewDays * 24 * 3600000;

    const withinTarget = calculateEfficiencyIndex({
      startedCount: 10,
      completedCount: 10,
      firstPassAcceptedCount: 10,
      backflowCount: 0,
      avgProgressToReviewMs: targetMs - 1,
      targetReviewDays,
    });

    expect(withinTarget).toBeGreaterThanOrEqual(95);
  });
});

describe('getEfficiencyStatus', () => {
  it('maps thresholds from legacy', () => {
    expect(getEfficiencyStatus(96)).toBe('Excellent');
    expect(getEfficiencyStatus(85)).toBe('Healthy');
    expect(getEfficiencyStatus(70)).toBe('Watch');
    expect(getEfficiencyStatus(55)).toBe('Risk');
    expect(getEfficiencyStatus(40)).toBe('Critical');
  });
});

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
        excludeFromEfficiencyBackflow: false,
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
        excludeFromEfficiencyBackflow: false,
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
        excludeFromEfficiencyBackflow: false,
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
    expect(kpi.backflowCount).toBe(0);
  });
});

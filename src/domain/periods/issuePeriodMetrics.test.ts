import { describe, expect, it } from 'vitest';
import type { AuditIssue } from '../jira/types';
import type { ReportParams } from '../jira/types';
import { getLastNDaysRange } from './dateRange';
import type { Person } from '../people/types';
import { computeIssuesFlowMetrics, computeTeamFlowMetrics } from './issuePeriodMetrics';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function issue(partial: Partial<AuditIssue> & { issueKey: string }): AuditIssue {
  return {
    issueSummary: partial.issueSummary || partial.issueKey,
    issueCreated: partial.issueCreated || '2026-01-01',
    assigneeName: 'Anna',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    currentStatus: partial.currentStatus || 'In Progress',
    rangeEvents: [],
    events: partial.events || [],
    ...partial,
  };
}

describe('computeIssuesFlowMetrics', () => {
  it('counts backflow on active issue without completion in range', () => {
    const now = new Date('2026-03-04T12:00:00');
    const range = getLastNDaysRange(28, now);
    const issues = [
      issue({
        issueKey: 'ACTIVE-BF',
        currentStatus: 'In Progress',
        events: [
          {
            eventType: 'Status',
            changedAt: '2026-02-28T10:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'In Progress',
            timeSincePreviousStatusMs: null,
            isBackflow: true,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
    ];

    const metrics = computeIssuesFlowMetrics(issues, range, params);
    expect(metrics.completedCount).toBe(0);
    expect(metrics.backflowCount).toBe(1);
  });

  it('counts backflow inside range when completion is outside range', () => {
    const range = getLastNDaysRange(28, new Date('2026-03-04T12:00:00'));
    const issues = [
      issue({
        issueKey: 'BF-IN-RANGE',
        currentStatus: 'Done',
        events: [
          {
            eventType: 'Status',
            changedAt: '2026-02-20T10:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'In Progress',
            timeSincePreviousStatusMs: null,
            isBackflow: true,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
          {
            eventType: 'Status',
            changedAt: '2025-12-01T10:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'Done',
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
    ];

    const metrics = computeIssuesFlowMetrics(issues, range, params);
    expect(metrics.completedCount).toBe(0);
    expect(metrics.backflowCount).toBe(1);
  });

  it('ignores backflow outside range when completion is inside range', () => {
    const range = getLastNDaysRange(28, new Date('2026-03-04T12:00:00'));
    const issues = [
      issue({
        issueKey: 'DONE-IN-RANGE',
        currentStatus: 'Done',
        events: [
          {
            eventType: 'Status',
            changedAt: '2025-11-01T10:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'In Progress',
            timeSincePreviousStatusMs: null,
            isBackflow: true,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
          {
            eventType: 'Status',
            changedAt: '2026-02-28T10:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'Done',
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
    ];

    const metrics = computeIssuesFlowMetrics(issues, range, params);
    expect(metrics.completedCount).toBe(1);
    expect(metrics.backflowCount).toBe(0);
  });

  it('excludes active issues from First Pass denominator', () => {
    const range = getLastNDaysRange(28, new Date('2026-03-04T12:00:00'));
    const issues = [
      issue({
        issueKey: 'ACTIVE',
        currentStatus: 'In Progress',
        events: [],
      }),
      issue({
        issueKey: 'DONE',
        currentStatus: 'Done',
        events: [
          {
            eventType: 'Status',
            changedAt: '2026-02-28T10:00:00',
            changedBy: 'Anna',
            fromValue: 'Review',
            toValue: 'Done',
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
    ];

    const metrics = computeIssuesFlowMetrics(issues, range, params);
    expect(metrics.completedCount).toBe(1);
    expect(metrics.firstPassCount).toBeLessThanOrEqual(1);
  });
});

function personWithIssue(id: string, name: string, sharedIssue: AuditIssue): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: name,
      firstName: name,
      lastName: '',
      workEmail: `${id}@co.com`,
      jobTitle: '',
      status: 'Active',
    },
    jira: { accountId: id, displayName: name, email: `${id}@co.com`, canonicalKey: id },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: null,
    performance: null,
    issues: [sharedIssue],
  };
}

describe('computeTeamFlowMetrics', () => {
  it('dedupes reassigned issues for team completed count', () => {
    const range = getLastNDaysRange(28, new Date('2026-03-04T12:00:00'));
    const shared = issue({
      issueKey: 'SHARED-1',
      currentStatus: 'Done',
      events: [
        {
          eventType: 'Status',
          changedAt: '2026-02-28T10:00:00',
          changedBy: 'Anna',
          fromValue: 'Review',
          toValue: 'Done',
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
    });
    const persons = [personWithIssue('1', 'Anna', shared), personWithIssue('2', 'Bob', shared)];
    const metrics = computeTeamFlowMetrics(persons, range, params);
    expect(metrics.completedCount).toBe(1);
  });

  it('dedupes reassigned issues for team backflow count', () => {
    const range = getLastNDaysRange(28, new Date('2026-03-04T12:00:00'));
    const shared = issue({
      issueKey: 'SHARED-BF',
      currentStatus: 'In Progress',
      events: [
        {
          eventType: 'Status',
          changedAt: '2026-02-20T10:00:00',
          changedBy: 'Anna',
          fromValue: 'Review',
          toValue: 'In Progress',
          timeSincePreviousStatusMs: null,
          isBackflow: true,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
    });
    const persons = [personWithIssue('1', 'Anna', shared), personWithIssue('2', 'Bob', shared)];
    const metrics = computeTeamFlowMetrics(persons, range, params);
    expect(metrics.backflowCount).toBe(1);
  });
});

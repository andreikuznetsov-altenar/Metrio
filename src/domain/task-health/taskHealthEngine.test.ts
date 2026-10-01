import { describe, expect, it } from 'vitest';
import {
  classifyTaskHealth,
  getCurrentStageAgeMs,
  getCurrentStageStartedAt,
} from './taskHealthEngine';
import type { AuditIssue, ReportParams } from '../jira/types';

const params: ReportParams = {
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31',
  targetReviewDays: 3,
  users: ['user@co.com'],
  projects: [],
};

function issue(partial: Partial<AuditIssue>): AuditIssue {
  return {
    issueKey: 'ABC-1',
    issueSummary: 'Test',
    issueCreated: '2025-09-01T10:00:00.000Z',
    assigneeName: 'User',
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
    currentStatus: 'In Progress',
    ...partial,
  };
}

describe('TaskHealthEngine active stage', () => {
  it('detects at_risk from current-stage age', () => {
    const now = new Date('2025-09-04T10:00:00.000Z');
    const active = issue({
      currentStatus: 'In Progress',
      events: [
        {
          eventType: 'Status',
          changedAt: '2025-09-01T10:00:00.000Z',
          changedBy: 'u',
          fromValue: 'To Do',
          toValue: 'In Progress',
          timeSincePreviousStatusMs: 0,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    const health = classifyTaskHealth({ issue: active, params, now });
    expect(health.status).toBe('at_risk');
    expect(health.currentStageAgeMs).toBeGreaterThan(0);
  });

  it('detects problematic when stage exceeds target', () => {
    const now = new Date('2025-09-05T10:00:00.000Z');
    const active = issue({
      currentStatus: 'In Review',
      events: [
        {
          eventType: 'Status',
          changedAt: '2025-09-01T10:00:00.000Z',
          changedBy: 'u',
          fromValue: 'In Progress',
          toValue: 'In Review',
          timeSincePreviousStatusMs: 0,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    const health = classifyTaskHealth({ issue: active, params, now });
    expect(health.status).toBe('problematic');
  });

  it('detects backflow as problematic', () => {
    const now = new Date('2025-09-04T10:00:00.000Z');
    const active = issue({
      currentStatus: 'In Progress',
      events: [
        {
          eventType: 'Status',
          changedAt: '2025-09-03T10:00:00.000Z',
          changedBy: 'u',
          fromValue: 'In Review',
          toValue: 'In Progress',
          timeSincePreviousStatusMs: 0,
          isBackflow: true,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    expect(classifyTaskHealth({ issue: active, params, now }).status).toBe('problematic');
  });

  it('detects no activity', () => {
    const now = new Date('2025-09-20T10:00:00.000Z');
    const active = issue({
      currentStatus: 'In Progress',
      issueCreated: '2025-09-01T10:00:00.000Z',
      events: [
        {
          eventType: 'Status',
          changedAt: '2025-09-01T10:00:00.000Z',
          changedBy: 'u',
          fromValue: 'To Do',
          toValue: 'In Progress',
          timeSincePreviousStatusMs: 0,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    expect(classifyTaskHealth({ issue: active, params, now }).status).toBe('no_activity');
  });

  it('exposes current stage started at', () => {
    const active = issue({
      issueCreated: '2025-09-01T10:00:00.000Z',
      currentStatus: 'In Progress',
      events: [
        {
          eventType: 'Status',
          changedAt: '2025-09-01T10:00:00.000Z',
          changedBy: 'u',
          fromValue: '',
          toValue: 'To Do',
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
        {
          eventType: 'Status',
          changedAt: '2025-09-02T10:00:00.000Z',
          changedBy: 'u',
          fromValue: 'To Do',
          toValue: 'In Progress',
          timeSincePreviousStatusMs: 0,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    expect(getCurrentStageStartedAt(active)).toBe('2025-09-02T10:00:00.000Z');
    expect(getCurrentStageAgeMs(active, new Date('2025-09-03T10:00:00.000Z'))).toBeGreaterThan(0);
  });
});

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
  it('detects at_risk when the Active stage reaches its (stage-specific) attention age', () => {
    // Active attention = review rule (3) + in-progress grace (2) = 5 weekdays for the default profile.
    const now = new Date('2025-09-08T10:00:00.000Z');
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
          excludeFromBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    const health = classifyTaskHealth({
      issue: active,
      params,
      now,
      thresholds: { noActivityDays: 30 },
    });
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
          excludeFromBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    const health = classifyTaskHealth({ issue: active, params, now });
    expect(health.status).toBe('problematic');
  });

  it('treats a fresh unresolved return from review as at_risk rework, not a permanent defect', () => {
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
          excludeFromBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    const health = classifyTaskHealth({ issue: active, params, now });
    expect(health.status).toBe('at_risk');
    expect(health.reasonCode).toBe('unresolved_rework');
    expect(health.reworkState).toBe('unresolved');
  });

  it('detects no activity', () => {
    // Within the Active target (so staleness, not an overdue stage, is the finding).
    const now = new Date('2025-09-09T10:00:00.000Z');
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
          excludeFromBackflow: false,
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
          excludeFromBackflow: false,
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
          excludeFromBackflow: false,
        },
      ],
      rangeEvents: [],
    });
    expect(getCurrentStageStartedAt(active)).toBe('2025-09-02T10:00:00.000Z');
    expect(getCurrentStageAgeMs(active, new Date('2025-09-03T10:00:00.000Z'))).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import type { AuditIssue } from '../jira/types';
import {
  getIssueCompletionAt,
  getIssueFullCycleMs,
  isTransitionToCompletion,
} from './issueCompletion';
import { getProfileById } from '../workflows/profileRegistry';

function issue(partial: Partial<AuditIssue> & Pick<AuditIssue, 'issueKey'>): AuditIssue {
  return {
    issueSummary: partial.issueSummary || 'Task',
    issueCreated: partial.issueCreated || '2026-01-01',
    assigneeName: 'Me',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    events: partial.events || [],
    rangeEvents: partial.rangeEvents || [],
    currentStatus: partial.currentStatus || 'Done',
    ...partial,
  };
}

describe('issueCompletion', () => {
  it('detects completion transitions', () => {
    const profile = getProfileById('ux')!;
    expect(isTransitionToCompletion(profile, 'In Review', 'Done')).toBe(true);
    expect(isTransitionToCompletion(profile, 'Done', 'In Progress')).toBe(false);
  });

  it('uses final completion when reopened and completed again', () => {
    const completedAt = getIssueCompletionAt(
      issue({
        issueKey: 'PROJ-1',
        currentStatus: 'Done',
        events: [
          {
            eventType: 'Status',
            changedAt: '2026-02-01T10:00:00',
            changedBy: 'A',
            fromValue: 'In Review',
            toValue: 'Done',
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
          {
            eventType: 'Status',
            changedAt: '2026-02-05T10:00:00',
            changedBy: 'A',
            fromValue: 'Done',
            toValue: 'In Progress',
            timeSincePreviousStatusMs: null,
            isBackflow: true,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
          {
            eventType: 'Status',
            changedAt: '2026-02-10T10:00:00',
            changedBy: 'A',
            fromValue: 'In Review',
            toValue: 'Done',
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
    );
    expect(completedAt).toBe('2026-02-10T10:00:00');
  });

  it('returns null completion for currently active issue', () => {
    const completedAt = getIssueCompletionAt(
      issue({
        issueKey: 'PROJ-2',
        currentStatus: 'In Progress',
        events: [],
      }),
    );
    expect(completedAt).toBeNull();
  });

  it('populates full cycle ms from completed cycle', () => {
    const cycleMs = getIssueFullCycleMs(
      issue({
        issueKey: 'PROJ-3',
        currentStatus: 'Done',
        events: [
          {
            eventType: 'Status',
            changedAt: '2026-02-01T09:00:00',
            changedBy: 'A',
            fromValue: 'To Do',
            toValue: 'In Progress',
            timeSincePreviousStatusMs: null,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
          {
            eventType: 'Status',
            changedAt: '2026-02-02T09:00:00',
            changedBy: 'A',
            fromValue: 'In Progress',
            toValue: 'Review',
            timeSincePreviousStatusMs: 8 * 60 * 60 * 1000,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
          {
            eventType: 'Status',
            changedAt: '2026-02-03T09:00:00',
            changedBy: 'A',
            fromValue: 'Review',
            toValue: 'Done',
            timeSincePreviousStatusMs: 8 * 60 * 60 * 1000,
            isBackflow: false,
            isHandoff: false,
            isReturnToTeam: false,
            excludeFromEfficiencyBackflow: false,
          },
        ],
      }),
    );
    expect(cycleMs).toBeGreaterThan(0);
  });
});

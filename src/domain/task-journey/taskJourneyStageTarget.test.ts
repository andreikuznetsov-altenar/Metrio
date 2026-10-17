import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { buildTaskJourney } from './buildTaskJourney';
import { resolveStageAttentionTarget } from '../task-health/stageAttentionTargets';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { taskHealthThresholdsFromRules } from '../operationalRules/normalizeOperationalRules';
import { DEFAULT_OPERATIONAL_RULES } from '../operationalRules/operationalRulesDefaults';

/**
 * "Target" in the task drawer is the weekday target of the CURRENT stage. The report's Review target
 * (here 18) applies to Review only; On Hold / Waiting / Blocked have no duration target, so the
 * drawer shows none and reports the blocked age separately.
 */
const params: ReportParams = {
  dateFrom: '2026-07-01', dateTo: '2026-10-16', targetReviewDays: 18, users: [], projects: ['UX'],
};
const NOW = new Date('2026-10-14T10:00:00.000Z');

function status(changedAt: string, from: string, to: string): IssueEvent {
  return {
    eventType: 'Status', changedAt, changedBy: 'x', fromValue: from, toValue: to,
    timeSincePreviousStatusMs: null, isBackflow: false, isHandoff: false,
    isReturnToTeam: false, excludeFromBackflow: false,
  };
}

/** An issue that entered `currentStatus` on `enteredAt`. */
function issue(currentStatus: string, enteredAt: string): AuditIssue {
  return {
    issueKey: 'UX-1', issueSummary: 'Sample', issueCreated: '2026-07-01T09:00:00.000Z',
    assigneeName: 'Daria', currentAssigneeDisplayName: 'Daria Chernova', issueTypeName: 'Task',
    contentType: 'none', designImprovementType: '', epicKey: '', epicSummary: '', epicStatus: '',
    epicContentType: '', epicDesignImprovementType: '', rangeEvents: [], currentStatus,
    events: [status(enteredAt, 'To Do', currentStatus)],
  } as AuditIssue;
}

const problem = (status: string, enteredAt = '2026-09-01T09:00:00.000Z') =>
  buildTaskJourney({ issue: issue(status, enteredAt), params, now: NOW }).problem;

describe('task journey Target is the current stage target', () => {
  it('shows the report Review target (18 weekdays) only for a task in Review', () => {
    const review = problem('In Review');
    expect(review.stageTargetDays).toBe(18);
    expect(review.detailLines).toContain('Target: 18 weekdays');
  });

  it('shows the stage\'s own target for In Progress, not the Review target', () => {
    const profile = resolveWorkflowProfile(issue('In Progress', '2026-09-01T09:00:00.000Z'));
    const expected = resolveStageAttentionTarget({
      profile, stage: 'active', reviewTargetDays: 18,
      bases: taskHealthThresholdsFromRules(DEFAULT_OPERATIONAL_RULES).stageBases,
    }).targetDays;
    const active = problem('In Progress');
    expect(active.stageTargetDays).toBe(expected);
    expect(expected).not.toBe(18);
    expect(active.detailLines).toContain(`Target: ${expected} weekdays`);
  });

  it('shows no duration target for On Hold, and keeps the blocked age', () => {
    const hold = problem('On Hold');
    expect(hold.stageTargetDays).toBeNull();
    expect(hold.detailLines.some((line) => line.startsWith('Target:'))).toBe(false);
    expect(hold.detailLines.some((line) => /18 weekdays/.test(line))).toBe(false);
    // The blocked age and the delivery-risk reason are still reported.
    expect(hold.detailLines.some((line) => line.startsWith('Current stage: On Hold ·'))).toBe(true);
    expect(hold.primaryReason).toMatch(/Blocked or on hold for \d+ weekdays/);
    expect(hold.currentStageAgeMs).toBeGreaterThan(0);
  });

  it('shows no target for a completed task or an unmapped status', () => {
    expect(problem('Done').stageTargetDays).toBeNull();
    expect(problem('Some Unknown Status').stageTargetDays).toBeNull();
  });
});

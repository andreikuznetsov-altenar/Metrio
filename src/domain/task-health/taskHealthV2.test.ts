import { describe, expect, it } from 'vitest';
import { classifyTaskHealth } from './taskHealthEngine';
import { resolveStageAttentionTarget } from './stageAttentionTargets';
import { assessDeliveryRiskSeverity, applyOwnerLeaveEscalation } from '../radar/deliveryRiskSeverity';
import { buildDeliveryRiskItems } from '../radar/deliveryRisk';
import { calculateWorkload } from '../workload/workloadEngine';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person, TeamSnapshot } from '../people/types';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-10-16',
  targetReviewDays: 3,
  users: ['u@co.com'],
  projects: [],
};

function statusEvent(changedAt: string, fromValue: string, toValue: string, isBackflow = false) {
  return {
    eventType: 'Status' as const,
    changedAt,
    changedBy: 'u',
    fromValue,
    toValue,
    timeSincePreviousStatusMs: 0,
    isBackflow,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromBackflow: false,
  };
}

function issue(partial: Partial<AuditIssue> & { events?: AuditIssue['events'] }): AuditIssue {
  return {
    issueKey: 'ABC-1',
    issueSummary: 'Test',
    issueCreated: '2026-09-01T10:00:00.000Z',
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
    currentAssigneeCanonical: '1',
    ...partial,
  } as AuditIssue;
}

describe('stage/profile-specific attention targets', () => {
  it('does not use one target for Active, Review and QA', () => {
    const profile = { id: 'classic_review' };
    const active = resolveStageAttentionTarget({ profile, stage: 'active', reviewTargetDays: 18 });
    const review = resolveStageAttentionTarget({ profile, stage: 'review', reviewTargetDays: 18 });
    const qa = resolveStageAttentionTarget({ profile, stage: 'qa', reviewTargetDays: 18 });
    expect(review.targetDays).toBe(18);
    expect(active.targetDays).not.toBe(review.targetDays);
    expect(qa.targetDays).not.toBe(review.targetDays);
    expect(new Set([active.targetDays, review.targetDays, qa.targetDays]).size).toBe(3);
  });

  it('review target is the configured targetReviewDays; Active/QA do not follow it', () => {
    const profile = { id: 'classic_review' };
    const a3 = resolveStageAttentionTarget({ profile, stage: 'active', reviewTargetDays: 3 });
    const a30 = resolveStageAttentionTarget({ profile, stage: 'active', reviewTargetDays: 30 });
    expect(a3).toEqual(a30);
  });

  it('boards differ: design boards get longer Active targets, incident boards shorter', () => {
    const base = resolveStageAttentionTarget({ profile: { id: 'classic_review' }, stage: 'active' });
    const ux = resolveStageAttentionTarget({ profile: { id: 'ux' }, stage: 'active' });
    const incident = resolveStageAttentionTarget({ profile: { id: 'adf_incident' }, stage: 'active' });
    expect(ux.targetDays).toBeGreaterThan(base.targetDays);
    expect(incident.targetDays).toBeLessThan(base.targetDays);
  });

  it('Critical threshold is exactly twice the target; attention starts at or below the target', () => {
    for (const id of ['classic_review', 'ux', 'governance', 'adf_incident']) {
      for (const stage of ['active', 'review', 'qa'] as const) {
        const t = resolveStageAttentionTarget({ profile: { id }, stage, reviewTargetDays: 6 });
        expect(t.criticalDays).toBe(t.targetDays * 2);
        expect(t.attentionDays).toBeLessThanOrEqual(t.targetDays);
      }
    }
  });
});

describe('Task Health uses the stage target of the CURRENT stage', () => {
  // 8 weekdays in the stage: Mon 2026-10-05 -> Wed 2026-10-14 (now).
  const now = new Date('2026-10-14T10:00:00.000Z');
  const entered = '2026-10-02T10:00:00.000Z'; // 8 weekdays before `now`

  it('the same stage age is fine in Active but overdue in Review (targetReviewDays 3)', () => {
    const active = issue({
      currentStatus: 'In Progress',
      events: [statusEvent(entered, 'To Do', 'In Progress')],
    });
    const review = issue({
      currentStatus: 'In Review',
      events: [statusEvent(entered, 'In Progress', 'In Review')],
    });
    const a = classifyTaskHealth({ issue: active, params, now });
    const r = classifyTaskHealth({ issue: review, params, now });
    expect(a.status).not.toBe('problematic');
    expect(r.status).toBe('problematic');
    expect(r.reasonCode).toBe('stage_overdue');
    expect(a.stageKind).toBe('active');
    expect(r.stageKind).toBe('review');
    expect(r.stageTarget?.targetDays).toBe(3);
  });

  it('a large report review target does not make Active work on-time forever', () => {
    const longRunning = issue({
      currentStatus: 'In Progress',
      events: [statusEvent('2026-08-03T10:00:00.000Z', 'To Do', 'In Progress')],
    });
    const health = classifyTaskHealth({
      issue: longRunning,
      params: { ...params, targetReviewDays: 30 },
      now,
    });
    expect(health.status).toBe('problematic');
    expect(health.reasonCode).toBe('stage_overdue');
  });
});

describe('Backflow health: current unresolved rework vs historical rework', () => {
  const now = new Date('2026-10-14T10:00:00.000Z');

  it('a resubmitted (resolved) backflow does not keep the task problematic', () => {
    const resolved = issue({
      currentStatus: 'In Review',
      events: [
        statusEvent('2026-09-28T10:00:00.000Z', 'To Do', 'In Progress'),
        statusEvent('2026-09-29T10:00:00.000Z', 'In Progress', 'In Review'),
        statusEvent('2026-09-30T10:00:00.000Z', 'In Review', 'In Progress', true),
        statusEvent('2026-10-13T10:00:00.000Z', 'In Progress', 'In Review'),
      ],
    });
    const health = classifyTaskHealth({ issue: resolved, params, now });
    expect(health.backflowEventCount).toBeGreaterThan(0);
    expect(health.reworkState).toBe('resolved');
    expect(health.status).toBe('stable');
    expect(health.reasons.join(' ')).not.toMatch(/backflow/i);
    // First Pass is a completed-cycle metric; an open task has no verdict yet.
    expect(health.isFirstPass).toBeNull();
  });

  it('an unresolved return is current rework and is surfaced (and bounded, not critical by itself)', () => {
    const unresolved = issue({
      currentStatus: 'In Progress',
      events: [
        statusEvent('2026-10-05T10:00:00.000Z', 'To Do', 'In Progress'),
        statusEvent('2026-10-06T10:00:00.000Z', 'In Progress', 'In Review'),
        statusEvent('2026-10-13T10:00:00.000Z', 'In Review', 'In Progress', true),
      ],
    });
    const health = classifyTaskHealth({ issue: unresolved, params, now });
    expect(health.reworkState).toBe('unresolved');
    expect(health.reasonCode).toBe('unresolved_rework');
    expect(assessDeliveryRiskSeverity(health)?.severity).toBe('warning');
  });
});

describe('Hold / Blocked invariant', () => {
  const now = new Date('2026-10-14T10:00:00.000Z');

  function personWith(issues: AuditIssue[], availabilityState: Person['availability']['state'] = 'available'): Person {
    return {
      id: '1',
      bamboo: {
        id: '1',
        displayName: 'Anna',
        firstName: 'Anna',
        lastName: '',
        workEmail: 'a@co.com',
        jobTitle: '',
        status: 'Active',
      },
      jira: { accountId: '1', displayName: 'Anna', email: 'a@co.com', canonicalKey: '1' },
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: availabilityState, label: availabilityState, isHoliday: false },
      workload: null,
      performance: null,
      issues,
      ownedIssues: issues,
    } as Person;
  }

  function snapshotOf(person: Person): TeamSnapshot {
    return {
      mode: 'team',
      summary: { available: 1, onVacation: 0, vacationSoon: 0, heavyOrOverloaded: 0, problematic: 0 },
      persons: [person],
    };
  }

  const held = (recent: boolean) =>
    issue({
      issueKey: 'HOLD-1',
      currentStatus: 'On Hold',
      events: [
        statusEvent(recent ? '2026-10-14T08:00:00.000Z' : '2026-08-03T10:00:00.000Z', 'In Progress', 'On Hold'),
      ],
    });

  it.each([true, false])('on hold (recent=%s): Task Health blocked/problematic, Delivery Risk yes, effort zero', (recent) => {
    const health = classifyTaskHealth({ issue: held(recent), params, now });
    expect(health.status).toBe('problematic');
    expect(health.reasonCode).toBe('blocked');
    expect(health.stageKind).toBe('hold');

    const person = personWith([held(recent)]);
    const items = buildDeliveryRiskItems(snapshotOf(person), params, now);
    expect(items.map((i) => i.issueKey)).toContain('HOLD-1');
    expect(items[0]!.reasonCode).toBe('blocked');

    const workload = calculateWorkload(person.issues, params, undefined, person.availability, { now });
    expect(workload.expectedEffortHours).toBe(0);
    expect(workload.currentLoadPercent).toBe(0);
    const row = workload.effortBreakdown?.find((b) => b.issueKey === 'HOLD-1');
    expect(row?.contributionHours ?? 0).toBe(0);
  });

  it('blocked for a short time is a Warning (W1); long-blocked is Critical (C1)', () => {
    const short = classifyTaskHealth({ issue: held(true), params, now });
    const long = classifyTaskHealth({ issue: held(false), params, now });
    expect(assessDeliveryRiskSeverity(short)).toMatchObject({ severity: 'warning', rule: 'W1' });
    expect(assessDeliveryRiskSeverity(long)).toMatchObject({ severity: 'critical', rule: 'C1' });
  });
});

describe('Delivery Risk severity rules', () => {
  const now = new Date('2026-10-14T10:00:00.000Z');
  const inProgress = (enteredAt: string) =>
    issue({ currentStatus: 'In Progress', events: [statusEvent(enteredAt, 'To Do', 'In Progress')] });
  const inReview = (enteredAt: string) =>
    issue({ currentStatus: 'In Review', events: [statusEvent(enteredAt, 'In Progress', 'In Review')] });

  it('Info: attention age reached but still within target (I1)', () => {
    // Review target 3, attention age 3 -> use targetReviewDays 6 so A(3) < T(6).
    const health = classifyTaskHealth({
      issue: inReview('2026-10-08T10:00:00.000Z'),
      params: { ...params, targetReviewDays: 6 },
      now,
    });
    expect(assessDeliveryRiskSeverity(health)).toMatchObject({ severity: 'info', rule: 'I1' });
  });

  it('Warning: beyond target up to twice the target (W2); Critical: beyond twice the target (C2)', () => {
    const warn = classifyTaskHealth({ issue: inReview('2026-10-08T10:00:00.000Z'), params, now }); // 4 weekdays > T(3)
    const crit = classifyTaskHealth({ issue: inReview('2026-09-21T10:00:00.000Z'), params, now }); // 17 weekdays > 2T(6)
    expect(assessDeliveryRiskSeverity(warn)).toMatchObject({ severity: 'warning', rule: 'W2' });
    expect(assessDeliveryRiskSeverity(crit)).toMatchObject({ severity: 'critical', rule: 'C2' });
  });

  it('healthy and completed tasks produce no Delivery Risk', () => {
    const healthy = classifyTaskHealth({ issue: inProgress('2026-10-13T10:00:00.000Z'), params, now });
    expect(assessDeliveryRiskSeverity(healthy)).toBeNull();
  });

  it('owner leave never creates a risk and never makes a healthy task critical', () => {
    const person = {
      id: '1',
      bamboo: { id: '1', displayName: 'Anna', firstName: 'Anna', lastName: '', workEmail: 'a@co.com', jobTitle: '', status: 'Active' },
      jira: { accountId: '1', displayName: 'Anna', email: 'a@co.com', canonicalKey: '1' },
      identity: { matchedBy: 'email', warnings: [] },
      availability: { state: 'vacation_tomorrow', label: 'Vacation tomorrow', isHoliday: false },
      workload: null,
      performance: null,
      issues: [inProgress('2026-10-13T10:00:00.000Z')],
      ownedIssues: [inProgress('2026-10-13T10:00:00.000Z')],
    } as unknown as Person;
    const items = buildDeliveryRiskItems(
      { mode: 'team', summary: { available: 0, onVacation: 0, vacationSoon: 1, heavyOrOverloaded: 0, problematic: 0 }, persons: [person] },
      params,
      now,
    );
    expect(items).toEqual([]);
  });

  it('owner leave escalation is bounded: info→warning soon, warning→critical only when leave is tomorrow', () => {
    expect(applyOwnerLeaveEscalation('info', 'soon')).toBe('warning');
    expect(applyOwnerLeaveEscalation('info', 'tomorrow')).toBe('warning');
    expect(applyOwnerLeaveEscalation('warning', 'soon')).toBe('warning');
    expect(applyOwnerLeaveEscalation('warning', 'tomorrow')).toBe('critical');
    expect(applyOwnerLeaveEscalation('critical', 'tomorrow')).toBe('critical');
    expect(applyOwnerLeaveEscalation('warning', 'none')).toBe('warning');
  });
});

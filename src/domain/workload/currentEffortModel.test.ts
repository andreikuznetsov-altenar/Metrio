import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { computeCurrentEffort } from './effort/currentEffortModel';
import { buildEffortHistory } from './effort/history';
import type { EffortHistory } from './effort/types';
import { calculateWorkload } from './workloadEngine';

const NOW = new Date(2026, 0, 19, 12, 0, 0, 0); // Monday, local time in every test TZ.
const EMPTY_HISTORY: EffortHistory = { execution: [], reserveVisits: [], startWaits: [] };
const params: ReportParams = {
  dateFrom: '2025-01-01',
  dateTo: '2026-01-19',
  targetReviewDays: 3,
  users: ['person'],
  projects: [],
};

function localIso(year: number, month: number, day: number, hour: number): string {
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString();
}

function event(fromValue: string, toValue: string, changedAt: string): IssueEvent {
  return {
    eventType: 'Status',
    changedAt,
    changedBy: 'Tester',
    fromValue,
    toValue,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromBackflow: false,
  };
}

function issue(
  issueKey: string,
  currentStatus: string,
  overrides: Partial<AuditIssue> = {},
): AuditIssue {
  return {
    issueKey,
    projectKey: 'UX',
    issueSummary: issueKey,
    issueCreated: localIso(2026, 1, 12, 9),
    assigneeName: 'Person',
    currentAssigneeCanonical: 'person',
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
    currentStatus,
    ...overrides,
  };
}

function completedExecution(key: string, hours: number): AuditIssue {
  const startHour = 9;
  return issue(key, 'Done', {
    issueCreated: localIso(2026, 1, 5, startHour),
    events: [
      event('To Do', 'In Progress', localIso(2026, 1, 5, startHour)),
      event('In Progress', 'Done', localIso(2026, 1, 5 + Math.floor(hours / 8), startHour + (hours % 8))),
    ],
  });
}

function reviewOutcome(key: string, returned: boolean): AuditIssue {
  const events = [
    event('To Do', 'In Progress', localIso(2026, 1, 5, 9)),
    event('In Progress', 'In Review', localIso(2026, 1, 5, 13)),
  ];
  if (returned) {
    events.push(
      event('In Review', 'Need to Fix', localIso(2026, 1, 6, 9)),
      event('Need to Fix', 'Done', localIso(2026, 1, 6, 13)),
    );
  } else {
    events.push(event('In Review', 'Done', localIso(2026, 1, 6, 9)));
  }
  return issue(key, 'Done', { issueCreated: localIso(2026, 1, 5, 8), events });
}

describe('Current Workload Model V2', () => {
  it('same issue count with different structured effort produces different load', () => {
    const small = computeCurrentEffort({
      issues: [issue('UX-1', 'TODO', { originalEstimateHours: 4, dueDate: '2026-01-23' })],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    const large = computeCurrentEffort({
      issues: [issue('UX-2', 'TODO', { originalEstimateHours: 40, dueDate: '2026-01-23' })],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    expect(small.expectedEffortHours).toBe(3.6);
    expect(large.expectedEffortHours).toBe(36);
    expect(large.currentLoadPercent).toBeGreaterThan(small.currentLoadPercent);
  });

  it('20 review issues keep review pressure visible without automatically overloading', () => {
    const result = calculateWorkload(
      Array.from({ length: 20 }, (_, i) => issue(`UX-R${i}`, 'In Review')),
      params,
      undefined,
      undefined,
      { now: NOW, effortHistory: EMPTY_HISTORY },
    );
    expect(result.pipeline).toMatchObject({ assigned: 20, review: 20, handsOn: 0 });
    expect(result.reserveReworkHours).toBe(16);
    expect(result.level).toBe('low');
  });

  it('derives review reserve from observed backflow probability and rework duration', () => {
    const historyIssues = Array.from({ length: 10 }, (_, i) => reviewOutcome(`UX-H${i}`, i < 5));
    const history = buildEffortHistory(historyIssues, { now: NOW });
    const result = computeCurrentEffort({
      issues: [issue('UX-CURRENT', 'In Review')],
      history,
      now: NOW,
    });
    expect(result.breakdown[0]).toMatchObject({
      returnProbability: 0.5,
      expectedReworkHours: 4,
      reserveHours: 2,
      contributionHours: 2,
    });
  });

  it('QA performed by another role contributes only expected rework reserve', () => {
    const result = computeCurrentEffort({
      issues: [issue('ADF-1', 'QA IN PROGRESS', { projectKey: 'ADF' })],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    expect(result.breakdown[0]).toMatchObject({
      effortMode: 'external_wait',
      returnProbability: 0.15,
      reserveHours: 0.6,
      contributionHours: 0.6,
    });
  });

  it('hold and waiting contribute zero live effort while remaining assigned', () => {
    const result = computeCurrentEffort({
      issues: [
        issue('UX-HOLD', 'On Hold'),
        issue('ADF-WAIT', 'Release Candidate', { projectKey: 'ADF' }),
      ],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    expect(result.expectedEffortHours).toBe(0);
    expect(result.pipeline).toMatchObject({ assigned: 2, hold: 1, waiting: 1 });
    expect(result.breakdown.every((item) => item.contributionHours === 0)).toBe(true);
  });

  it('blocked work remains delivery risk while adding zero workload effort', () => {
    const result = calculateWorkload(
      [issue('ADF-BLOCKED', 'Blocked', { projectKey: 'ADF', issueCreated: localIso(2026, 1, 19, 9) })],
      params,
      undefined,
      undefined,
      { now: NOW, effortHistory: EMPTY_HISTORY },
    );
    expect(result.problematicCount).toBeGreaterThan(0);
    expect(result.expectedEffortHours).toBe(0);
  });

  it('estimates active remaining effort conditional on elapsed business time', () => {
    const history = buildEffortHistory(
      [8, 10, 12, 14, 16].map((hours, i) => completedExecution(`UX-D${i}`, hours)),
      { now: NOW },
    );
    const active = issue('UX-ACTIVE', 'In Progress', {
      issueCreated: localIso(2026, 1, 16, 11),
      events: [event('To Do', 'In Progress', localIso(2026, 1, 16, 11))],
    });
    const result = computeCurrentEffort({ issues: [active], history, now: NOW });
    expect(result.breakdown[0]?.elapsedHandsOnHours).toBe(9);
    expect(result.breakdown[0]?.estimatedRemainingHours).toBe(4);
  });

  it('uses due date to raise queued start probability inside the horizon', () => {
    const scheduled = computeCurrentEffort({
      issues: [issue('UX-DUE', 'TODO', { originalEstimateHours: 8, dueDate: '2026-01-23' })],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    const unscheduled = computeCurrentEffort({
      issues: [issue('UX-LATER', 'TODO', { originalEstimateHours: 8 })],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    expect(scheduled.breakdown[0]?.startProbability).toBe(0.9);
    expect(unscheduled.breakdown[0]?.startProbability).toBe(0.5);
    expect(scheduled.expectedEffortHours).toBeGreaterThan(unscheduled.expectedEffortHours);
  });

  it('reduces available capacity for four leave days in the ten-day horizon', () => {
    const result = computeCurrentEffort({
      issues: [],
      history: EMPTY_HISTORY,
      now: NOW,
      leave: [{ start: '2026-01-21', end: '2026-01-26' }],
    });
    expect(result.horizonWorkingDays).toBe(10);
    expect(result.leaveWorkingDays).toBe(4);
    expect(result.availableHoursInHorizon).toBe(48);
  });

  it('applies an explicit board volume adapter only to history/fallback estimates', () => {
    const base = computeCurrentEffort({
      issues: [issue('UX-SIZED', 'To Do')],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    const sized = computeCurrentEffort({
      issues: [issue('UX-SIZED', 'To Do')],
      history: EMPTY_HISTORY,
      now: NOW,
      volumeAdapters: [{ id: 'games', multiplier: () => 2 }],
    });
    expect(sized.expectedEffortHours).toBe(base.expectedEffortHours * 2);
    expect(sized.breakdown[0]).toMatchObject({ volumeMultiplier: 2, volumeSource: 'games' });
  });

  it('reports the documented global fallback when no completed history exists', () => {
    const result = computeCurrentEffort({
      issues: [issue('UX-FALLBACK', 'TODO')],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    expect(result.breakdown[0]).toMatchObject({
      estimatedTotalHours: 12,
      estimateSource: 'global_fallback',
    });
  });

  it('unknown corporate status does not silently create workload', () => {
    const result = computeCurrentEffort({
      issues: [issue('ADF-X', 'Mystery Corporate State', { projectKey: 'ADF' })],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    expect(result.breakdown[0]).toMatchObject({ effortMode: 'none', contributionHours: 0 });
  });

  it('deduplicates an issue key and its contributions sum exactly to expected effort', () => {
    const duplicate = issue('UX-ONCE', 'TODO');
    const result = computeCurrentEffort({
      issues: [duplicate, duplicate],
      history: EMPTY_HISTORY,
      now: NOW,
    });
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown.reduce((sum, item) => sum + item.contributionHours, 0))
      .toBe(result.expectedEffortHours);
  });
});

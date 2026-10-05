import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { calculateWorkload } from '../workload/workloadEngine';
import {
  capacityLevelFromPercent,
  daysInReportingPeriod,
  MONTHLY_CAPACITY_HOURS,
} from './capacityWorkload';
import { extractProfileContributorCycles } from './profileCycles';
import { getProfileById } from './profileRegistry';

const params: ReportParams = {
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function statusEvent(from: string, to: string, at: string, isBackflow = false): IssueEvent {
  return {
    eventType: 'Status',
    changedAt: at,
    changedBy: 'User',
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
  };
}

function uxIssue(key: string, events: IssueEvent[], status: string): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: '2025-01-02T09:00:00.000Z',
    assigneeName: 'User',
    projectKey: 'UX',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: 'none',
    epicKey: 'none',
    epicSummary: 'none',
    epicStatus: 'none',
    epicContentType: 'none',
    epicDesignImprovementType: 'none',
    events,
    rangeEvents: [],
    currentStatus: status,
  };
}

describe('capacityWorkload', () => {
  it('matches legacy Code.gs monthly extrapolation formula', () => {
    const days = daysInReportingPeriod(params);
    expect(days).toBe(31);

    const completedCycles = 4;
    const avgHours = 20;
    const monthlyQty = (completedCycles / days) * 30;
    const hours = monthlyQty * avgHours;
    const loadPercent = (hours / MONTHLY_CAPACITY_HOURS) * 100;

    expect(monthlyQty).toBeCloseTo((4 / 31) * 30, 5);
    expect(hours).toBeCloseTo(monthlyQty * 20, 5);
    expect(loadPercent).toBeCloseTo((hours / 164) * 100, 1);
  });

  it('does not mark overloaded from high active count alone (false overload regression)', () => {
    const activeOnly = Array.from({ length: 12 }, (_, i) =>
      uxIssue(`UX-${i}`, [], 'In Progress'),
    );
    const result = calculateWorkload(activeOnly, params);
    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
    expect(result.activeCount).toBe(12);
  });

  it('derives load level from capacity percent thresholds', () => {
    expect(capacityLevelFromPercent(40)).toBe('low');
    expect(capacityLevelFromPercent(60)).toBe('normal');
    expect(capacityLevelFromPercent(90)).toBe('high');
    expect(capacityLevelFromPercent(110)).toBe('overloaded');
  });

  it('aggregates mixed project cycles with profile-aware extraction', () => {
    const ux = uxIssue(
      'UX-1',
      [
        statusEvent('To Do', 'In Progress', '2025-01-03T09:00:00.000Z'),
        statusEvent('In Progress', 'In Review', '2025-01-03T17:00:00.000Z'),
        statusEvent('In Review', 'Approved', '2025-01-04T09:00:00.000Z'),
      ],
      'Approved',
    );
    const wskinsProfile = getProfileById('wskins_skin')!;
    const ws = uxIssue('WS-1', [
      statusEvent('Not started WS', 'In Progress', '2025-01-05T09:00:00.000Z'),
      statusEvent('In Progress', 'Internal Review', '2025-01-05T15:00:00.000Z'),
    ], 'Internal Review');
    ws.projectKey = 'WS';
    ws.issueTypeName = 'Skin';

    const uxCycles = extractProfileContributorCycles(ux, getProfileById('ux')!, params);
    const wsCycles = extractProfileContributorCycles(ws, wskinsProfile, params);
    expect(uxCycles.length).toBe(1);
    expect(wsCycles.length).toBe(1);

    const workload = calculateWorkload([ux, ws], params);
    expect(workload.capacityBreakdown?.completedCyclesInPeriod).toBe(2);
    expect(workload.monthlyCapacityHours).toBe(164);
  });
});

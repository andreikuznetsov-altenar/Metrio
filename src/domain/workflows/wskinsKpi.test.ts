import { describe, expect, it } from 'vitest';
import { buildKpiFromIssues } from '../jira/kpi';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import {
  buildWskinsKpiFromIssues,
  calculateWskinsMainTaskKpiContribution,
  calculateWskinsSubtaskKpiContribution,
} from './wskinsKpi';

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

function wsIssue(
  key: string,
  events: IssueEvent[],
  partial: Partial<AuditIssue> = {},
): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: '2025-01-02T09:00:00.000Z',
    assigneeName: 'User',
    projectKey: 'WS',
    issueTypeName: 'Skin',
    contentType: 'none',
    designImprovementType: 'none',
    epicKey: 'none',
    epicSummary: 'none',
    epicStatus: 'none',
    epicContentType: 'none',
    epicDesignImprovementType: 'none',
    events,
    rangeEvents: [],
    currentStatus: 'Internal Review',
    ...partial,
  };
}

describe('wskins KPI parity', () => {
  it('counts main task completion at Internal Review once per issue', () => {
    const issue = wsIssue('WS-1', [
      statusEvent('Not started WS', 'In Progress', '2025-01-03T09:00:00.000Z'),
      statusEvent('In Progress', 'Internal Review', '2025-01-03T17:00:00.000Z'),
    ]);
    const contrib = calculateWskinsMainTaskKpiContribution(issue, params);
    expect(contrib.startedCount).toBe(1);
    expect(contrib.reviewSubmittedCount).toBe(1);
    expect(contrib.completedCount).toBe(1);
    expect(contrib.backflowCount).toBe(0);
    expect(contrib.workDurationsMs.length).toBe(1);
  });

  it('counts subtask review at On approval and completion at Done', () => {
    const issue = wsIssue(
      'WS-2',
      [
        statusEvent('To Do', 'In Progress', '2025-01-04T09:00:00.000Z'),
        statusEvent('In Progress', 'On approval', '2025-01-04T15:00:00.000Z'),
        statusEvent('On approval', 'Done', '2025-01-05T09:00:00.000Z'),
      ],
      { issueTypeName: 'Sub-task', isSubtask: true, currentStatus: 'Done' },
    );
    const contrib = calculateWskinsSubtaskKpiContribution(issue, params);
    expect(contrib.startedCount).toBe(1);
    expect(contrib.reviewSubmittedCount).toBe(1);
    expect(contrib.completedCount).toBe(1);
  });

  it('aggregates team KPI via buildWskinsKpiFromIssues', () => {
    const main = wsIssue('WS-10', [
      statusEvent('Not started WS', 'In Progress', '2025-01-06T09:00:00.000Z'),
      statusEvent('In Progress', 'Internal Review', '2025-01-06T17:00:00.000Z'),
    ]);
    const kpi = buildWskinsKpiFromIssues([main], params);
    expect(kpi.completedCount).toBe(1);
    expect(kpi.firstPassAcceptedCount).toBe(0);
    expect(kpi.holdCount).toBe(0);
    expect(kpi.efficiencyIndex).toBeGreaterThan(0);
    expect(buildKpiFromIssues([main], {}, params).holdCount).toBe(0);
  });
});

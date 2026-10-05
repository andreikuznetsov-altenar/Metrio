import { describe, expect, it } from 'vitest';
import type { AuditIssue, ReportParams } from '../jira/types';
import {
  calculateLegacyWorkloadAssessment,
  runWorkflowCapacityAudit,
} from './workflowCapacityAudit';
import { calculateWorkload } from '../workload/workloadEngine';

const params: ReportParams = {
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function issue(key: string, status = 'In Progress'): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: '2025-09-01T10:00:00.000Z',
    assigneeName: 'User',
    issueTypeName: 'Task',
    contentType: 'none',
    designImprovementType: 'none',
    epicKey: 'none',
    epicSummary: 'none',
    epicStatus: 'none',
    epicContentType: 'none',
    epicDesignImprovementType: 'none',
    events: [],
    rangeEvents: [],
    currentStatus: status,
  };
}

describe('workflowCapacityAudit', () => {
  it('legacy model can mark overloaded from high assign count without capacity cycles', () => {
    const issues = Array.from({ length: 15 }, (_, i) => issue(`UX-${i}`));
    const legacy = calculateLegacyWorkloadAssessment(issues, params);
    const capacity = calculateWorkload(issues, params);
    expect(legacy.level).toBe('overloaded');
    expect(capacity.level).toBe('normal');
    expect(capacity.capacityLoadPercent).toBe(0);
  });

  it('formats grouped audit report', () => {
    const report = runWorkflowCapacityAudit({
      params,
      grouped: {
        user1: {
          userLabel: 'Sample',
          issues: [issue('UX-1')],
          transitionStats: {},
        },
      },
      totalTransitions: 0,
      teamSummaryColumns: [],
      teamKpi: {
        startedCount: 0,
        reviewSubmittedCount: 0,
        completedCount: 0,
        firstPassAcceptedCount: 0,
        holdCount: 0,
        backflowCount: 0,
        avgProgressToReviewMs: null,
        avgReviewToDoneMs: null,
        avgProgressToHoldMs: null,
        avgTodoToApprovedMs: null,
        targetReviewDays: 3,
        efficiencyIndex: 0,
      },
      perUserKpi: {},
    });
    expect(report.textReport).toContain('Sample');
    expect(report.textReport).toContain('insufficient history');
    expect(report.personRows[0]?.capacityDataState).toBe('insufficient_history');
    expect(report.personRows).toHaveLength(1);
  });
});

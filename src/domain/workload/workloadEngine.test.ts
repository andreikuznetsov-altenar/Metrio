import { describe, expect, it } from 'vitest';
import { calculateWorkload } from './workloadEngine';
import type { AuditIssue, ReportParams } from '../jira/types';

const params: ReportParams = {
  dateFrom: '2025-01-01',
  dateTo: '2025-12-31',
  targetReviewDays: 3,
  users: ['user@co.com'],
  projects: [],
};

function activeIssue(key: string, status = 'In Progress'): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
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
    currentStatus: status,
  };
}

describe('calculateWorkload', () => {
  it('uses the current queue for workload even when capacity history is insufficient', () => {
    const result = calculateWorkload([activeIssue('A-1')], params);
    expect(result.level).toBe('low');
    expect(result.score).toBe(1);
    expect(result.capacityDataState).toBe('insufficient_history');
  });

  it('can flag a current high workload even with zero completed capacity cycles', () => {
    const issues = Array.from({ length: 6 }, (_, i) => activeIssue(`A-${i}`));
    const result = calculateWorkload(issues, params);
    expect(result.level).toBe('high');
    expect(result.score).toBe(6);
    expect(result.capacityDataState).toBe('insufficient_history');
    expect(result.capacityLoadPercent).toBe(0);
  });

  it('uses canonical completion semantics for active count (Published is not active)', () => {
    const published = activeIssue('PUB-1', 'Published');
    const inProgress = activeIssue('IP-1', 'In Progress');
    const result = calculateWorkload([published, inProgress], params);
    expect(result.activeCount).toBe(1);
  });

  it('matches personActiveCount semantics across completion states', () => {
    const statuses = [
      { status: 'Done', active: false },
      { status: 'Approved', active: false },
      { status: 'Published', active: false },
      { status: 'Closed', active: false },
      { status: 'Cancelled', active: false },
      { status: 'In Progress', active: true },
      { status: 'Review', active: false },
      { status: 'On Hold', active: false },
    ];
    statuses.forEach(({ status, active }) => {
      const result = calculateWorkload([activeIssue(status, status)], params);
      expect(result.activeCount).toBe(active ? 1 : 0);
    });
  });

  it('does not label vacation as overloaded', () => {
    const issues = Array.from({ length: 12 }, (_, i) => activeIssue(`A-${i}`));
    const result = calculateWorkload(issues, params, undefined, {
      state: 'on_vacation',
      label: 'Vacation',
      isHoliday: false,
    });
    expect(result.level).toBe('low');
    expect(result.capacityDataState).toBe('insufficient_history');
    expect(result.summary).toContain('Vacation');
  });
});

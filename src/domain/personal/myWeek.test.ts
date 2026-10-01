import { describe, expect, it } from 'vitest';
import { buildMyWeek } from './myWeek';
import type { Person } from '../people/types';
import type { AuditIssue, ReportParams } from '../jira/types';
import { testWorkload } from '../testFixtures';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

const basePerson: Person = {
  id: '1',
  bamboo: {
    id: '1',
    displayName: 'Me',
    firstName: 'Me',
    lastName: '',
    workEmail: 'me@co.com',
    jobTitle: '',
    status: 'Active',
  },
  jira: { accountId: '1', displayName: 'Me', email: 'me@co.com', canonicalKey: '1' },
  identity: { matchedBy: 'email', warnings: [] },
  availability: { state: 'available', label: 'Available', isHoliday: false },
  workload: testWorkload({ level: 'normal', activeCount: 1 }),
  performance: null,
  issues: [],
};

function doneIssue(key: string, completedAt: string): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: '2026-01-01',
    assigneeName: 'Me',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    currentStatus: 'Done',
    rangeEvents: [],
    events: [
      {
        eventType: 'Status',
        changedAt: completedAt,
        changedBy: 'Me',
        fromValue: 'Review',
        toValue: 'Done',
        timeSincePreviousStatusMs: null,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
  };
}

describe('buildMyWeek', () => {
  const now = new Date('2026-03-04T12:00:00');

  it('groups active and attention tasks', () => {
    const week = buildMyWeek(
      {
        ...basePerson,
        issues: [
          {
            issueKey: 'PROJ-1',
            issueSummary: 'Active',
            issueCreated: '2026-01-01',
            assigneeName: 'Me',
            issueTypeName: 'Task',
            contentType: '',
            designImprovementType: '',
            epicKey: '',
            epicSummary: '',
            epicStatus: '',
            epicContentType: '',
            epicDesignImprovementType: '',
            events: [],
            rangeEvents: [],
            currentStatus: 'In Progress',
          },
        ],
      },
      params,
      now,
    );
    expect(week.summary.currentlyActive).toBe(1);
    expect(week.inProgress).toHaveLength(1);
  });

  it('includes only completions in current local week', () => {
    const week = buildMyWeek(
      {
        ...basePerson,
        issues: [
          doneIssue('THIS-WEEK', '2026-03-03T10:00:00'),
          doneIssue('LAST-SUNDAY', '2026-03-01T10:00:00'),
          doneIssue('OLD', '2026-02-01T10:00:00'),
        ],
      },
      params,
      now,
    );
    expect(week.summary.completedThisWeek).toBe(1);
    expect(week.completedThisWeek.map((i) => i.issueKey)).toEqual(['THIS-WEEK']);
  });

  it('counts only backflow events in current week', () => {
    const week = buildMyWeek(
      {
        ...basePerson,
        issues: [
          {
            ...doneIssue('DONE', '2026-03-03T10:00:00'),
            events: [
              {
                eventType: 'Status',
                changedAt: '2026-03-03T10:00:00',
                changedBy: 'Me',
                fromValue: 'Review',
                toValue: 'Done',
                timeSincePreviousStatusMs: null,
                isBackflow: false,
                isHandoff: false,
                isReturnToTeam: false,
                excludeFromEfficiencyBackflow: false,
              },
              {
                eventType: 'Status',
                changedAt: '2026-03-03T11:00:00',
                changedBy: 'Me',
                fromValue: 'Review',
                toValue: 'In Progress',
                timeSincePreviousStatusMs: null,
                isBackflow: true,
                isHandoff: false,
                isReturnToTeam: false,
                excludeFromEfficiencyBackflow: false,
              },
            ],
          },
          doneIssue('OLD-BF', '2026-02-01T10:00:00'),
        ],
      },
      params,
      now,
    );
    expect(week.summary.backflowsThisWeek).toBe(1);
  });

  it('excludes completed issues from active groups', () => {
    const week = buildMyWeek(
      {
        ...basePerson,
        issues: [doneIssue('DONE', '2026-03-03T10:00:00')],
      },
      params,
      now,
    );
    expect(week.summary.currentlyActive).toBe(0);
    expect(week.inProgress).toHaveLength(0);
  });
});

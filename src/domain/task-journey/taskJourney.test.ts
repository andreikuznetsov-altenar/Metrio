import { describe, expect, it } from 'vitest';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { buildTaskJourney } from './buildTaskJourney';
import { compressStatusPath } from './compressStatusPath';
import { getFullStatusEventsSorted } from './issueEvents';
import { resolveIssueCurrentOwner } from './resolveIssueCurrentOwner';
import { classifyIssueAttention } from '../radar/taskSignals';
import type { Person } from '../people/types';
import { testWorkload } from '../testFixtures';

const params: ReportParams = {
  dateFrom: '2026-09-01',
  dateTo: '2026-10-09',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function statusEvent(
  changedAt: string,
  from: string,
  to: string,
  overrides: Partial<IssueEvent> = {},
): IssueEvent {
  return {
    eventType: 'Status',
    changedAt,
    changedBy: 'Tester',
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
    ...overrides,
  };
}

function assigneeEvent(
  changedAt: string,
  from: string,
  to: string,
  overrides: Partial<IssueEvent> = {},
): IssueEvent {
  return {
    eventType: 'Assignee',
    changedAt,
    changedBy: 'Tester',
    fromValue: from,
    toValue: to,
    timeSincePreviousStatusMs: null,
    isBackflow: false,
    isHandoff: false,
    isReturnToTeam: false,
    excludeFromEfficiencyBackflow: false,
    ...overrides,
  };
}

function baseIssue(overrides: Partial<AuditIssue> = {}): AuditIssue {
  return {
    issueKey: 'UX-1',
    issueSummary: 'Sample',
    issueCreated: '2026-09-01T09:00:00.000Z',
    assigneeName: 'Daria',
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
    currentStatus: 'To Do',
    currentAssigneeDisplayName: 'Daria Chernova',
    ...overrides,
  };
}

const dariaPerson: Person = {
  id: 'p-daria',
  bamboo: {
    id: 'p-daria',
    displayName: 'Daria Chernova',
    firstName: 'Daria',
    lastName: 'Chernova',
    workEmail: 'daria@co.com',
    jobTitle: '',
    status: 'Active',
  },
  jira: {
    accountId: 'acc-daria',
    displayName: 'Daria Chernova',
    email: 'daria@co.com',
    canonicalKey: 'daria',
  },
  identity: { matchedBy: 'email', warnings: [] },
  availability: { state: 'available', label: 'Available', isHoliday: false },
  workload: testWorkload({ level: 'normal', activeCount: 1 }),
  performance: null,
  issues: [],
};

describe('compressStatusPath', () => {
  it('preserves repeated stages and backflow marker', () => {
    const issue = baseIssue({
      currentStatus: 'Review',
      events: [
        statusEvent('2026-09-02T10:00:00.000Z', 'To Do', 'In Progress'),
        statusEvent('2026-09-03T10:00:00.000Z', 'In Progress', 'Review'),
        statusEvent('2026-09-04T10:00:00.000Z', 'Review', 'In Progress', {
          isBackflow: true,
        }),
        statusEvent('2026-09-05T10:00:00.000Z', 'In Progress', 'Review'),
      ],
    });
    expect(compressStatusPath(issue)).toBe(
      'To Do → In Progress → Review → ↩ In Progress → Review',
    );
    expect(getFullStatusEventsSorted(issue)).toHaveLength(4);
  });
});

describe('resolveIssueCurrentOwner', () => {
  it('uses current Jira assignee, not historical assigneeName', () => {
    const issue = baseIssue({
      assigneeName: 'Valeriia',
      currentAssigneeDisplayName: 'Daria Chernova',
      currentAssigneeCanonical: 'daria',
    });
    const owner = resolveIssueCurrentOwner(issue, [dariaPerson]);
    expect(owner.name).toBe('Daria Chernova');
    expect(owner.personId).toBe('p-daria');
  });
});

describe('buildTaskJourney assignee timeline', () => {
  it('includes handoffs and current owner', () => {
    const issue = baseIssue({
      currentAssigneeDisplayName: 'Daria Chernova',
      currentAssigneeCanonical: 'daria',
      events: [
        assigneeEvent('2026-10-01T10:00:00.000Z', 'Daria Chernova', 'Valeriia'),
        assigneeEvent('2026-10-08T10:00:00.000Z', 'Valeriia', 'Daria Chernova'),
      ],
    });
    const journey = buildTaskJourney({
      issue,
      params,
      persons: [dariaPerson],
      now: new Date('2026-10-09T12:00:00.000Z'),
    });
    const assigneeEntries = journey.timeline.filter((e) => e.kind === 'assignee_change');
    expect(assigneeEntries).toHaveLength(2);
    expect(journey.currentOwner.name).toBe('Daria Chernova');
  });
});

describe('buildTaskJourney range semantics', () => {
  it('uses full events even when rangeEvents is a subset', () => {
    const issue = baseIssue({
      currentStatus: 'Review',
      events: [
        statusEvent('2026-08-15T10:00:00.000Z', 'To Do', 'In Progress'),
        statusEvent('2026-09-10T10:00:00.000Z', 'In Progress', 'Review'),
      ],
      rangeEvents: [
        statusEvent('2026-09-10T10:00:00.000Z', 'In Progress', 'Review'),
      ],
    });
    const path = compressStatusPath(issue);
    expect(path).toBe('To Do → In Progress → Review');
  });
});

describe('canonical attention reasons', () => {
  const now = new Date('2026-10-09T12:00:00.000Z');

  it('A — long review', () => {
    const issue = baseIssue({
      currentStatus: 'Review',
      events: [
        statusEvent('2026-09-25T10:00:00.000Z', 'In Progress', 'Review'),
        assigneeEvent('2026-10-08T10:00:00.000Z', 'Daria Chernova', 'Valeriia'),
      ],
    });
    const attention = classifyIssueAttention(issue, params, now);
    expect(attention?.reason).toMatch(/Review for \d+ day|exceeds target duration/i);
    expect(attention?.reason).not.toMatch(/no_activity/);
  });

  it('F — no activity uses readable copy', () => {
    const issue = baseIssue({
      currentStatus: 'In Progress',
      events: [
        statusEvent('2026-09-01T10:00:00.000Z', 'To Do', 'In Progress'),
      ],
    });
    const attention = classifyIssueAttention(issue, params, now);
    expect(attention?.reason.toLowerCase()).toContain('no activity');
  });

  it('D — one backflow', () => {
    const issue = baseIssue({
      currentStatus: 'In Progress',
      events: [
        statusEvent('2026-09-20T10:00:00.000Z', 'In Progress', 'Review'),
        statusEvent('2026-10-01T10:00:00.000Z', 'Review', 'In Progress', {
          isBackflow: true,
        }),
        assigneeEvent('2026-10-08T10:00:00.000Z', 'Daria Chernova', 'Valeriia'),
      ],
    });
    const attention = classifyIssueAttention(issue, params, now);
    expect(attention?.reason).toBe('Backflow detected');
  });

  it('E — multiple backflows', () => {
    const issue = baseIssue({
      currentStatus: 'In Progress',
      events: [
        statusEvent('2026-09-10T10:00:00.000Z', 'In Progress', 'Review'),
        statusEvent('2026-09-15T10:00:00.000Z', 'Review', 'In Progress', {
          isBackflow: true,
        }),
        statusEvent('2026-09-20T10:00:00.000Z', 'In Progress', 'Review'),
        statusEvent('2026-10-01T10:00:00.000Z', 'Review', 'In Progress', {
          isBackflow: true,
        }),
        assigneeEvent('2026-10-08T10:00:00.000Z', 'Valeriia', 'Daria Chernova'),
      ],
    });
    const attention = classifyIssueAttention(issue, params, now);
    expect(attention?.reason).toBe('Backflow detected');
    expect(attention?.health.backflowCount).toBeGreaterThanOrEqual(2);
  });

  it('G — dependency blocker enriches journey reason', () => {
    const issue = baseIssue({ currentStatus: 'In Progress' });
    const journey = buildTaskJourney({
      issue,
      params,
      now,
      dependencyBlockerKey: 'UX-123',
    });
    expect(journey.problem.primaryReason).toContain('Blocked by UX-123');
  });
});

describe('incomplete history', () => {
  it('flags history incomplete without fabricating path', () => {
    const issue = baseIssue({ events: [], currentStatus: 'Review' });
    const journey = buildTaskJourney({ issue, params });
    expect(journey.historyNotice).toBe('History incomplete');
    expect(journey.compressedPath).toBe('Review');
  });
});

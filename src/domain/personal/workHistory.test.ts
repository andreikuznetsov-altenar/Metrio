import { describe, expect, it } from 'vitest';
import { buildWorkHistory } from './workHistory';
import type { Person } from '../people/types';
import type { ReportParams } from '../jira/types';
import { testWorkload } from '../testFixtures';

const params: ReportParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-03-01',
  targetReviewDays: 3,
  users: [],
  projects: [],
};

const person: Person = {
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
  workload: testWorkload({ level: 'normal' }),
  performance: null,
  issues: [
    {
      issueKey: 'PROJ-1',
      issueSummary: 'Done task',
      issueCreated: '2025-12-20',
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
          changedAt: '2025-12-29T10:00:00',
          changedBy: 'Me',
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
          changedAt: '2025-12-30T10:00:00',
          changedBy: 'Me',
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
          changedAt: '2025-12-31T10:00:00',
          changedBy: 'Me',
          fromValue: 'Review',
          toValue: 'Done',
          timeSincePreviousStatusMs: 8 * 60 * 60 * 1000,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
    },
  ],
};

describe('workHistory', () => {
  it('groups by ISO week across year boundary', () => {
    const groups = buildWorkHistory(person, params, 'week');
    expect(groups.some((g) => g.label === '2026-W01')).toBe(true);
  });

  it('uses completion timestamp and cycle time', () => {
    const groups = buildWorkHistory(person, params, 'week');
    const entry = groups.flatMap((g) => g.entries)[0];
    expect(entry?.completedAt).toBe('2025-12-31T10:00:00');
    expect(entry?.cycleMs).toBeGreaterThan(0);
  });
});

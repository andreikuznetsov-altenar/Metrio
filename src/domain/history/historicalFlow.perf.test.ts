import { describe, expect, it } from 'vitest';
import type { AuditIssue } from '../jira/types';
import type { Person } from '../people/types';
import { enumerateLocalDateKeys, getBootstrapDateRange, buildHistoricalPersonSnapshots } from './historicalFlow';
import { HISTORICAL_BOOTSTRAP_DAYS } from './constants';

function makeIssue(index: number): AuditIssue {
  const day = (index % 28) + 1;
  const date = `2026-02-${String(day).padStart(2, '0')}T10:00:00`;
  return {
    issueKey: `ISSUE-${index}`,
    issueSummary: `Issue ${index}`,
    issueCreated: '2026-01-01',
    assigneeName: 'User',
    issueTypeName: 'Task',
    contentType: '',
    designImprovementType: '',
    epicKey: '',
    epicSummary: '',
    epicStatus: '',
    epicContentType: '',
    epicDesignImprovementType: '',
    currentStatus: index % 3 === 0 ? 'Done' : 'In Progress',
    rangeEvents: [],
    events: [
      {
        eventType: 'Status',
        changedAt: date,
        changedBy: 'User',
        fromValue: index % 5 === 0 ? 'Review' : 'In Progress',
        toValue: index % 3 === 0 ? 'Done' : 'In Progress',
        timeSincePreviousStatusMs: null,
        isBackflow: index % 7 === 0,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
  };
}

function makePerson(id: string, issueCount: number): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: `User ${id}`,
      firstName: 'User',
      lastName: id,
      workEmail: `user${id}@co.com`,
      jobTitle: '',
      status: 'Active',
    },
    jira: { accountId: id, displayName: `User ${id}`, email: `user${id}@co.com`, canonicalKey: id },
    identity: { matchedBy: 'email', warnings: [] },
    availability: { state: 'available', label: 'Available', isHoliday: false },
    workload: null,
    performance: null,
    issues: Array.from({ length: issueCount }, (_, i) => makeIssue(Number(id) * 1000 + i)),
  };
}

describe('historicalFlow perf', () => {
  it('bootstraps 56 days for 10 users × 100 issues within budget', () => {
    const now = new Date('2026-03-04T12:00:00');
    const reportParams = {
      dateFrom: '2026-01-08',
      dateTo: '2026-03-04',
      targetReviewDays: 3,
      users: [],
      projects: [],
    };
    const { startKey, endKey } = getBootstrapDateRange(reportParams, now);
    const dateKeys = enumerateLocalDateKeys(startKey, endKey);
    expect(dateKeys).toHaveLength(HISTORICAL_BOOTSTRAP_DAYS);

    const persons = Array.from({ length: 10 }, (_, i) => makePerson(String(i + 1), 100));
    const params = {
      dateFrom: startKey,
      dateTo: endKey,
      targetReviewDays: 3,
      users: [],
      projects: [],
    };

    const start = performance.now();
    let snapshotCount = 0;
    for (const person of persons) {
      snapshotCount += buildHistoricalPersonSnapshots(person, dateKeys, params).length;
    }
    const elapsed = performance.now() - start;

    console.log(
      `[perf] historical bootstrap 10 users × 100 issues × ${HISTORICAL_BOOTSTRAP_DAYS} days: ${elapsed.toFixed(1)} ms (${snapshotCount} snapshots)`,
    );

    expect(snapshotCount).toBe(10 * HISTORICAL_BOOTSTRAP_DAYS);
    expect(elapsed).toBeLessThan(15000);
  });
});

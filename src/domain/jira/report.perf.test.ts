import { describe, expect, it } from 'vitest';
import { buildEnhancedJiraAuditReport } from './report';
import { buildTeamIdentityIndex } from './users';
import type { ReportParams, TeamUser } from './types';

function makeIssue(key: string, assigneeEmail: string) {
  return {
    key,
    fields: {
      summary: `Issue ${key}`,
      status: { name: 'Done' },
      assignee: { emailAddress: assigneeEmail, displayName: assigneeEmail },
      issuetype: { name: 'Task' },
      created: '2025-01-01T10:00:00.000+0000',
      resolutiondate: '2025-01-05T10:00:00.000+0000',
      customfield_10000: 'Design',
    },
  };
}

function makeChangelog(_issueKey: string) {
  return [
    {
      created: '2025-01-02T10:00:00.000+0000',
      items: [{ field: 'status', fromString: 'In Progress', toString: 'In Review' }],
    },
    {
      created: '2025-01-03T10:00:00.000+0000',
      items: [{ field: 'status', fromString: 'In Review', toString: 'Done' }],
    },
  ];
}

function buildFixture(userCount: number, issueCount: number) {
  const users = Array.from({ length: userCount }, (_, i) => `user${i}@example.com`);
  const teamUsers: TeamUser[] = users.map((email, i) => ({
    accountId: `acc-${i}`,
    displayName: `User ${i}`,
    email,
    canonical: email,
    inputUser: email,
  }));

  const issues = Array.from({ length: issueCount }, (_, i) =>
    makeIssue(`PROJ-${i + 1}`, users[i % users.length]),
  );

  const changelogByIssue = new Map<string, unknown[]>();
  issues.forEach((issue) => {
    changelogByIssue.set((issue as { key: string }).key, makeChangelog((issue as { key: string }).key));
  });

  const params: ReportParams = {
    dateFrom: '2025-01-01',
    dateTo: '2025-12-31',
    targetReviewDays: 3,
    users,
    projects: [],
  };

  return {
    issues,
    params,
    teamUsers,
    teamIdentityIndex: buildTeamIdentityIndex(teamUsers, users),
    changelogByIssue,
  };
}

async function measureReport(userCount: number, issueCount: number) {
  const fixture = buildFixture(userCount, issueCount);
  const started = performance.now();
  const report = await buildEnhancedJiraAuditReport({
    issues: fixture.issues,
    params: fixture.params,
    teamUsers: fixture.teamUsers,
    teamIdentityIndex: fixture.teamIdentityIndex,
    changelogByIssue: fixture.changelogByIssue,
    fetchIssueByKey: async (key) => fixture.issues.find((i) => (i as { key: string }).key === key) || null,
  });
  const elapsedMs = performance.now() - started;
  const userBlocks = Object.keys(report.grouped).length;
  return { elapsedMs, transitions: report.totalTransitions, userBlocks };
}

describe('Jira report performance (fixture-only)', () => {
  it('10 users / 500 issues baseline', async () => {
    const result = await measureReport(10, 500);
    expect(result.transitions).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log(`[perf] 10 users / 500 issues: ${result.elapsedMs.toFixed(1)} ms`);
  }, 60_000);

  it('10 users / 1000 issues baseline', async () => {
    const result = await measureReport(10, 1000);
    expect(result.transitions).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log(`[perf] 10 users / 1000 issues: ${result.elapsedMs.toFixed(1)} ms`);
  }, 120_000);
});

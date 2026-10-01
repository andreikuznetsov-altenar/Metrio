import { buildReporterSurveyJql } from '../../domain/survey/jql';
import {
  aggregateSurveyRecipients,
  type JiraReporterIssue,
} from '../../domain/survey/recipients';
import type { SurveyRecipient } from '../../domain/survey/types';
import type { TeamSnapshot } from '../../domain/people/types';
import type { OrgResolutionResult } from '../bamboo/orgResolver';
import type { BambooClient } from '../bamboo/bambooClient';
import { JiraClient } from '../jira/jiraClient';

const SURVEY_FIELDS = ['summary', 'reporter', 'assignee', 'created', 'project'];

function parseIssue(raw: Record<string, unknown>): JiraReporterIssue | null {
  const key = String(raw.key || '');
  const fields = (raw.fields || {}) as Record<string, unknown>;
  const reporter = (fields.reporter || {}) as Record<string, unknown>;
  const assignee = (fields.assignee || {}) as Record<string, unknown>;
  const project = (fields.project || {}) as Record<string, unknown>;

  const assigneeAccountId = String(assignee.accountId || '').trim();
  if (!assigneeAccountId) return null;

  return {
    key,
    summary: String(fields.summary || ''),
    projectKey: String(project.key || ''),
    reporter: {
      accountId: String(reporter.accountId || ''),
      displayName: String(reporter.displayName || ''),
      email: String(reporter.emailAddress || ''),
    },
    assigneeAccountId,
  };
}

function scopePersons(
  teamSnapshot: TeamSnapshot,
  teamDetection: OrgResolutionResult,
  scope: 'full' | 'direct',
) {
  if (scope === 'direct' && teamDetection.employee) {
    const directIds = new Set([
      teamDetection.employee.id,
      ...teamDetection.directReports.map((r) => r.id),
    ]);
    return teamSnapshot.persons.filter((p) => directIds.has(p.id));
  }
  return teamSnapshot.persons;
}

export async function discoverSurveyRecipients(input: {
  jiraClient: JiraClient;
  bambooClient: BambooClient;
  teamSnapshot: TeamSnapshot;
  teamDetection: OrgResolutionResult;
  dateFrom: string;
  dateTo: string;
  scope: 'full' | 'direct';
  projects: string[];
}): Promise<SurveyRecipient[]> {
  const persons = scopePersons(input.teamSnapshot, input.teamDetection, input.scope);

  const accountIds = persons
    .map((p) => p.jira?.accountId)
    .filter(Boolean) as string[];

  if (!accountIds.length) {
    throw new Error('No Jira account IDs resolved for the selected team scope.');
  }

  const jql = buildReporterSurveyJql({
    accountIds,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    projects: input.projects,
  });

  const issuesRaw = await input.jiraClient.fetchAllIssues(jql, SURVEY_FIELDS.join(','));
  const issues = issuesRaw
    .map((i) => parseIssue(i as Record<string, unknown>))
    .filter(Boolean) as JiraReporterIssue[];

  const roster = await input.bambooClient.listEmployees([
    'workEmail',
    'displayName',
    'firstName',
    'lastName',
    'preferredName',
    'surname',
    'bestEmail',
    'email',
  ]);

  return aggregateSurveyRecipients(issues, {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    targetAccountIds: new Set(accountIds),
    bambooRoster: roster,
  });
}

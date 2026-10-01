import { escapeJqlValue } from '../jira/jql';

export interface SurveyJqlParams {
  accountIds: string[];
  dateFrom: string;
  dateTo: string;
  projects: string[];
}

export function buildReporterSurveyJql(params: SurveyJqlParams): string {
  const accountIds = params.accountIds
    .filter(Boolean)
    .map((id) => `"${escapeJqlValue(id)}"`);

  if (!accountIds.length) {
    throw new Error('No Jira users were found for the selected team scope.');
  }

  const parts = [
    `assignee in (${accountIds.join(', ')})`,
    `created >= "${params.dateFrom}"`,
    `created <= "${params.dateTo}"`,
  ];

  if (params.projects.length) {
    const projectsClause = params.projects
      .map((v) => `"${escapeJqlValue(v)}"`)
      .join(', ');
    parts.push(`project in (${projectsClause})`);
  }

  return `${parts.join(' AND ')} ORDER BY created ASC`;
}

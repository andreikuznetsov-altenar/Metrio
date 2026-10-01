import type { ReportParams } from './types';

export function escapeJqlValue(value: string): string {
  return String(value).replace(/"/g, '\\"');
}

/** Port of legacy buildJql_ */
export function buildJql(params: ReportParams): string {
  const usersClause = params.users.map((v) => `"${escapeJqlValue(v)}"`).join(', ');

  const currentAssigneeClause = `assignee in (${usersClause})`;
  let historyAssigneeClause = `assignee WAS IN (${usersClause})`;

  if (params.dateFrom && params.dateTo) {
    historyAssigneeClause = `assignee WAS IN (${usersClause}) DURING ("${params.dateFrom}", "${params.dateTo}")`;
  } else if (params.dateFrom) {
    historyAssigneeClause = `assignee WAS IN (${usersClause}) AFTER "${params.dateFrom}"`;
  } else if (params.dateTo) {
    historyAssigneeClause = `assignee WAS IN (${usersClause}) BEFORE "${params.dateTo}"`;
  }

  const parts = [`(${currentAssigneeClause} OR ${historyAssigneeClause})`];

  if (params.projects.length) {
    const projectsClause = params.projects.map((v) => `"${escapeJqlValue(v)}"`).join(', ');
    parts.push(`project in (${projectsClause})`);
  }

  if (params.dateFrom) {
    parts.push(`updated >= "${params.dateFrom}"`);
  }

  if (params.dateTo) {
    parts.push(`updated <= "${params.dateTo}"`);
  }

  return `${parts.join(' AND ')} ORDER BY updated ASC, key ASC`;
}

export function splitLinesOrComma(text: string): string[] {
  return String(text || '')
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeReportParams(formData: {
  dateFrom?: string;
  dateTo?: string;
  targetReviewDays?: number | string;
  usersText?: string;
  projectsText?: string;
  users?: string[];
  projects?: string[];
  teamScope?: 'full' | 'direct';
}): ReportParams {
  const users =
    formData.users ||
    splitLinesOrComma(formData.usersText || '');

  const projects =
    formData.projects ||
    splitLinesOrComma(formData.projectsText || '');

  return {
    dateFrom: (formData.dateFrom || '').trim(),
    dateTo: (formData.dateTo || '').trim(),
    targetReviewDays: Math.max(1, Number(formData.targetReviewDays || 3) || 3),
    users,
    projects,
    teamScope: formData.teamScope,
  };
}

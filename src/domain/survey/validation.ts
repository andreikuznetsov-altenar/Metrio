import type { PrepareValidationIssue, SurveyConfigDefaults } from './types';

export interface PrepareValidationInput {
  dateFrom: string;
  dateTo: string;
  jiraConfigured: boolean;
  bambooConfigured: boolean;
  teamDetected: boolean;
  googleConnected: boolean;
  defaults: SurveyConfigDefaults;
}

function parseScaleBounds(options: string): { min: number; max: number } | null {
  const parts = String(options || '1|5')
    .split('|')
    .map((v) => Number(String(v).trim()));
  const min = parts[0];
  const max = parts[1];
  if (Number.isNaN(min) || Number.isNaN(max) || min >= max) return null;
  return { min, max };
}

export function validatePrepareSurvey(input: PrepareValidationInput): PrepareValidationIssue[] {
  const issues: PrepareValidationIssue[] = [];

  if (!input.dateFrom || !input.dateTo) {
    issues.push({ field: 'dateRange', message: 'Choose a valid survey date range.' });
  } else if (input.dateFrom > input.dateTo) {
    issues.push({ field: 'dateRange', message: 'Start date must be before end date.' });
  }

  if (!input.jiraConfigured) {
    issues.push({ field: 'jira', message: 'Configure Jira in Settings before preparing a survey.' });
  }
  if (!input.bambooConfigured) {
    issues.push({ field: 'bamboo', message: 'Configure BambooHR in Settings before preparing a survey.' });
  }
  if (!input.teamDetected) {
    issues.push({ field: 'team', message: 'Detect your team in Settings before preparing a survey.' });
  }
  if (!input.googleConnected) {
    issues.push({ field: 'google', message: 'Connect your Google account in Settings.' });
  }

  const activeQuestions = input.defaults.questions.filter((q) => q.active);
  if (!activeQuestions.length) {
    issues.push({ field: 'questions', message: 'Enable at least one active question.' });
  }

  for (const q of activeQuestions) {
    if (!q.title.trim()) {
      issues.push({ field: `question:${q.id}`, message: 'Active questions need a non-empty title.' });
    }
    if (q.type === 'scale') {
      if (!parseScaleBounds(q.options)) {
        issues.push({
          field: `question:${q.id}`,
          message: `Scale question "${q.title || q.id}" needs valid min|max bounds.`,
        });
      }
    }
    if (q.type === 'multiple') {
      const options = String(q.options || '')
        .split('|')
        .map((v) => v.trim())
        .filter(Boolean);
      if (options.length < 2) {
        issues.push({
          field: `question:${q.id}`,
          message: `Multiple-choice question "${q.title || q.id}" needs at least two options.`,
        });
      }
    }
  }

  return issues;
}

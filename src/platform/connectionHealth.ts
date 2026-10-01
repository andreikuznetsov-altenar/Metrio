import type { AppPreferences } from './preferences';
import type { ConnectionStatus } from '../domain/connectionStatus';

export type ConnectionHealthLevel = 'ok' | 'attention' | 'offline';

export type ConnectionIntegration = 'Jira' | 'Bamboo';

export type IntegrationConnectionState = 'connected' | 'attention' | 'offline';

export interface ConnectionHealthInput {
  prefs: AppPreferences;
  jiraStatus: ConnectionStatus;
  bambooStatus: ConnectionStatus;
  hasJiraToken: boolean;
  hasBambooToken: boolean;
}

export interface ConnectionHealthSummary {
  level: ConnectionHealthLevel;
  headerLabel: 'Connected' | 'Needs attention' | 'Offline';
  label: string;
  detail: string;
  issues: ConnectionIntegration[];
}

export interface PerformanceConnectionAttention {
  show: boolean;
  message: string;
  reconnectPath: '/settings/connections';
}

function integrationIssues(input: ConnectionHealthInput): ConnectionIntegration[] {
  const issues: ConnectionIntegration[] = [];

  if (!input.hasJiraToken) {
    issues.push('Jira');
  } else if (
    input.jiraStatus === 'error' ||
    (input.jiraStatus !== 'connected' && input.jiraStatus !== 'loading')
  ) {
    issues.push('Jira');
  }

  if (!input.hasBambooToken) {
    issues.push('Bamboo');
  } else if (
    input.bambooStatus === 'error' ||
    (input.bambooStatus !== 'connected' && input.bambooStatus !== 'loading')
  ) {
    issues.push('Bamboo');
  }

  return issues;
}

export function listConnectionIssues(input: ConnectionHealthInput): ConnectionIntegration[] {
  return integrationIssues(input);
}

export function formatConnectionAttentionMessage(issues: ConnectionIntegration[]): string {
  const hasJira = issues.includes('Jira');
  const hasBamboo = issues.includes('Bamboo');
  if (hasJira && hasBamboo) return 'Connections need attention.';
  if (hasJira) return 'Jira connection needs attention.';
  if (hasBamboo) return 'BambooHR connection needs attention.';
  return 'Connections need attention.';
}

export function getIntegrationConnectionState(
  integration: ConnectionIntegration,
  input: ConnectionHealthInput,
): IntegrationConnectionState {
  const hasToken = integration === 'Jira' ? input.hasJiraToken : input.hasBambooToken;
  const status = integration === 'Jira' ? input.jiraStatus : input.bambooStatus;

  if (!hasToken) return 'offline';
  if (status === 'connected') return 'connected';
  if (status === 'loading') return 'connected';
  if (status === 'error') return 'attention';
  return 'attention';
}

export function getPerformanceConnectionAttention(
  input: ConnectionHealthInput & { teamDetectionOk: boolean },
): PerformanceConnectionAttention | null {
  if (!input.prefs.setup.completed || !input.teamDetectionOk) return null;

  const issues = integrationIssues(input);
  if (!issues.length) return null;

  return {
    show: true,
    message: formatConnectionAttentionMessage(issues),
    reconnectPath: '/settings/connections',
  };
}

export function summarizeConnectionHealth(input: ConnectionHealthInput): ConnectionHealthSummary {
  const issues = integrationIssues(input);

  if (!input.hasJiraToken && !input.hasBambooToken) {
    const detail = input.prefs.setup.completed
      ? 'Reconnect Jira and Bamboo in Settings → Connections.'
      : 'Complete setup to connect Jira and Bamboo.';
    return {
      level: 'offline',
      headerLabel: 'Offline',
      label: 'Offline',
      detail,
      issues,
    };
  }

  if (!issues.length) {
    return {
      level: 'ok',
      headerLabel: 'Connected',
      label: 'Connected',
      detail: 'Jira and Bamboo are configured.',
      issues,
    };
  }

  const detail =
    issues.length === 1
      ? `Open Connections to review ${issues[0]} settings.`
      : `${issues.join(' and ')} require configuration or retry.`;

  return {
    level: 'attention',
    headerLabel: 'Needs attention',
    label: issues.length === 1 ? `${issues[0]} needs attention` : 'Connections need attention',
    detail,
    issues,
  };
}

export function credentialsAreConfigured(input: {
  hasJiraToken: boolean;
  hasBambooToken: boolean;
}): boolean {
  return input.hasJiraToken && input.hasBambooToken;
}

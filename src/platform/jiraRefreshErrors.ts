import { ApiError, parseInvokeError } from './apiTypes';
import { sanitizeLogMessage } from './logSanitize';

export type JiraRefreshFailureKind = 'credential' | 'access' | 'transient' | 'cancelled' | 'setup';

export interface JiraRefreshFailure {
  kind: JiraRefreshFailureKind;
  userMessage: string;
  issueKey?: string;
  code?: string;
  logDetail: string;
}

const CREDENTIAL_CODES = new Set(['jira_auth_invalid', 'credential_missing', 'keychain_error']);
const ACCESS_CODES = new Set(['jira_access_denied']);
const TRANSIENT_CODES = new Set([
  'network_error',
  'tls_error',
  'timeout_error',
  'rate_limited',
  'jira_server_error',
  'read_error',
]);

export function extractIssueKeyFromError(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'issueKey' in error) {
    const key = (error as { issueKey?: string }).issueKey;
    if (key) return key;
  }
  const message = error instanceof Error ? error.message : String(error);
  const match = /Changelog failed for ([A-Z][A-Z0-9]+-\d+)/i.exec(message);
  return match?.[1];
}

export function classifyJiraRefreshFailure(
  error: unknown,
  hasExistingReportData: boolean,
): JiraRefreshFailure {
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (rawMessage.includes('cancelled')) {
    return {
      kind: 'cancelled',
      userMessage: rawMessage,
      logDetail: sanitizeLogMessage(rawMessage),
    };
  }

  if (
    rawMessage.includes('Jira API token is not configured') ||
    rawMessage.includes('credential_missing') ||
    rawMessage.includes('Keychain')
  ) {
    return {
      kind: 'credential',
      userMessage: 'Jira connection needs attention. Reconnect in Settings → Connections.',
      logDetail: sanitizeLogMessage(rawMessage),
    };
  }

  if (rawMessage.includes('Team detection required') || rawMessage.includes('No team members')) {
    return {
      kind: 'setup',
      userMessage: rawMessage,
      logDetail: sanitizeLogMessage(rawMessage),
    };
  }

  const apiError = error instanceof ApiError ? error : parseInvokeError(error);
  const issueKey = extractIssueKeyFromError(error);
  const code = apiError.code;

  if (CREDENTIAL_CODES.has(code) || apiError.status === 401) {
    return {
      kind: 'credential',
      userMessage: 'Jira connection needs attention. Reconnect in Settings → Connections.',
      issueKey,
      code,
      logDetail: formatJiraRefreshLogDetail({ operation: 'run_report', issueKey, code, status: apiError.status }),
    };
  }

  if (ACCESS_CODES.has(code) || apiError.status === 403) {
    return {
      kind: 'access',
      userMessage: 'Jira access is restricted. Review permissions in Settings → Connections.',
      issueKey,
      code,
      logDetail: formatJiraRefreshLogDetail({ operation: 'run_report', issueKey, code, status: apiError.status }),
    };
  }

  if (TRANSIENT_CODES.has(code) || isTransientTransportMessage(rawMessage)) {
    const base = hasExistingReportData
      ? "Jira data couldn't be refreshed. Existing dashboard data may be stale."
      : issueKey
        ? "Couldn't refresh Jira data while loading issue history. Try again."
        : "Couldn't load Jira data. Check your connection and try again.";
    const withIssue =
      issueKey && !hasExistingReportData ? `${base} Issue: ${issueKey}.` : base;
    return {
      kind: 'transient',
      userMessage: withIssue,
      issueKey,
      code,
      logDetail: formatJiraRefreshLogDetail({ operation: 'fetch_changelog', issueKey, code, status: apiError.status }),
    };
  }

  return {
    kind: 'transient',
    userMessage: hasExistingReportData
      ? "Jira data couldn't be refreshed. Existing dashboard data may be stale."
      : "Couldn't load Jira data. Try again.",
    issueKey,
    code,
    logDetail: formatJiraRefreshLogDetail({ operation: 'run_report', issueKey, code, status: apiError.status }),
  };
}

function isTransientTransportMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('error sending request for url') ||
    lower.includes('connection') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  );
}

export function formatJiraRefreshLogDetail(input: {
  operation: string;
  issueKey?: string;
  code?: string;
  status?: number;
  attempt?: number;
  host?: string;
}): string {
  const parts = [
    `operation=${input.operation}`,
    input.issueKey ? `issueKey=${input.issueKey}` : null,
    input.code ? `code=${input.code}` : null,
    input.status ? `status=${input.status}` : null,
    input.attempt ? `attempt=${input.attempt}` : null,
    input.host ? `host=${input.host}` : null,
  ].filter(Boolean);
  return parts.join(' ');
}

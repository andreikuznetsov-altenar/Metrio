import { describe, expect, it } from 'vitest';
import { ApiError } from '../../platform/apiTypes';
import { buildJiraConnectionDiagnostic, mapJiraConnectionError } from './jiraConnectionErrors';

describe('jiraConnectionErrors', () => {
  it('maps 401 to actionable auth message', () => {
    const error = mapJiraConnectionError(
      new ApiError({
        code: 'jira_auth_invalid',
        message: 'Unauthorized',
        status: 401,
        url: 'https://altenar.atlassian.net/rest/api/3/myself',
      }),
      { exists: true, readable: true, length: 24 },
    );
    expect(error.code).toBe('jira_auth_invalid');
    expect(error.message).toContain("couldn't verify your email and API token");
  });

  it('maps network errors separately from auth failures', () => {
    const error = mapJiraConnectionError(
      new ApiError({
        code: 'network_error',
        message: 'connection refused',
        url: 'https://altenar.atlassian.net/rest/api/3/myself',
      }),
      { exists: true, readable: true, length: 24 },
    );
    expect(error.code).toBe('jira_network');
    expect(error.message).toContain("couldn't reach Jira");
  });

  it('maps unreadable keychain storage before Jira request', () => {
    const error = mapJiraConnectionError(new Error('unexpected'), {
      exists: false,
      readable: false,
      length: undefined,
    });
    expect(error.code).toBe('keychain_missing');
    expect(error.message).toContain('Keychain');
  });

  it('builds sanitized diagnostics without secrets', () => {
    const diagnostic = buildJiraConnectionDiagnostic(
      new ApiError({
        code: 'jira_auth_invalid',
        message: 'Unauthorized',
        status: 401,
        url: 'https://altenar.atlassian.net/rest/api/3/myself',
      }),
      { exists: true, readable: true, length: 24 },
    );
    expect(diagnostic).toMatchObject({
      operation: 'jira_connection_test',
      host: 'altenar.atlassian.net',
      endpoint: '/rest/api/3/myself',
      credentialReadable: true,
      status: 401,
    });
    expect(JSON.stringify(diagnostic)).not.toContain('Authorization');
  });
});

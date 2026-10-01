import { describe, expect, it } from 'vitest';
import { ApiError } from './apiTypes';
import { classifyJiraRefreshFailure } from './jiraRefreshErrors';

describe('classifyJiraRefreshFailure', () => {
  it('treats network changelog errors as transient while keeping friendly copy', () => {
    const err = Object.assign(
      new ApiError({
        code: 'network_error',
        message: 'error sending request for url (https://altenar.atlassian.net/rest/api/3/issue/UX-4433/changelog)',
      }),
      { issueKey: 'UX-4433' },
    );
    const failure = classifyJiraRefreshFailure(err, true);
    expect(failure.kind).toBe('transient');
    expect(failure.userMessage).toContain("couldn't be refreshed");
    expect(failure.userMessage).not.toContain('https://');
    expect(failure.logDetail).not.toContain('https://');
    expect(failure.logDetail).not.toContain('/rest/api/');
  });

  it('uses history copy when no prior report data', () => {
    const err = Object.assign(new ApiError({ code: 'network_error', message: 'timeout' }), {
      issueKey: 'UX-4433',
    });
    const failure = classifyJiraRefreshFailure(err, false);
    expect(failure.userMessage).toContain('issue history');
    expect(failure.userMessage).toContain('UX-4433');
  });

  it('maps 401 to credential failure', () => {
    const err = new ApiError({ code: 'jira_auth_invalid', message: 'Unauthorized', status: 401 });
    const failure = classifyJiraRefreshFailure(err, true);
    expect(failure.kind).toBe('credential');
    expect(failure.userMessage).toContain('Reconnect');
  });

  it('maps 403 to access failure', () => {
    const err = new ApiError({ code: 'jira_access_denied', message: 'Forbidden', status: 403 });
    const failure = classifyJiraRefreshFailure(err, false);
    expect(failure.kind).toBe('access');
    expect(failure.userMessage).toContain('restricted');
  });
});

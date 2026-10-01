import { describe, expect, it } from 'vitest';
import { verifyJiraEmailMatch } from './jiraIdentity';

describe('verifyJiraEmailMatch', () => {
  const identity = {
    accountId: 'acc-1',
    displayName: 'Andrei Kuznetsov',
    emailAddress: 'andrei.kuznetsov@altenar.com',
  };

  it('verifies matching email case-insensitively', () => {
    const result = verifyJiraEmailMatch('Andrei.Kuznetsov@Altenar.com', identity);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state).toBe('verified_email');
  });

  it('allows hidden Jira email', () => {
    const result = verifyJiraEmailMatch('andrei.kuznetsov@altenar.com', {
      ...identity,
      emailAddress: undefined,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state).toBe('hidden_email');
  });

  it('blocks visible email mismatch', () => {
    const result = verifyJiraEmailMatch('andrei.kuznetsov@altenar.com', {
      ...identity,
      emailAddress: 'other@altenar.com',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.entered).toContain('andrei');
      expect(result.jira).toBe('other@altenar.com');
    }
  });
});

import { describe, expect, it } from 'vitest';
import { sanitizeLogMessage } from './logSanitize';

describe('sanitizeLogMessage', () => {
  it('redacts full Jira REST URLs from transport errors', () => {
    const raw =
      'error sending request for url (https://altenar.atlassian.net/rest/api/3/issue/UX-4433/changelog)';
    expect(sanitizeLogMessage(raw)).not.toContain('https://');
    expect(sanitizeLogMessage(raw)).not.toContain('/rest/api/');
    expect(sanitizeLogMessage(raw)).toContain('[url_redacted]');
  });

  it('redacts bearer tokens', () => {
    expect(sanitizeLogMessage('Authorization Bearer abc.def')).toContain('Bearer [redacted]');
  });
});

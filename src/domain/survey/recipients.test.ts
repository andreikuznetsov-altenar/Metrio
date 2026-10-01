import { describe, expect, it } from 'vitest';
import { aggregateSurveyRecipients, recipientIdentityKey, resolveReporterEmail } from './recipients';

describe('recipient aggregation', () => {
  it('deduplicates reporters across multiple issues', () => {
    const recipients = aggregateSurveyRecipients(
      [
        {
          key: 'ABC-1',
          summary: 'One',
          projectKey: 'ABC',
          assigneeAccountId: 'assignee-1',
          reporter: { accountId: 'rep-1', displayName: 'Reporter A', email: 'rep@co.com' },
        },
        {
          key: 'ABC-2',
          summary: 'Two',
          projectKey: 'ABC',
          assigneeAccountId: 'assignee-1',
          reporter: { accountId: 'rep-1', displayName: 'Reporter A', email: 'rep@co.com' },
        },
      ],
      {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        targetAccountIds: new Set(['assignee-1']),
        bambooRoster: [],
      },
    );

    expect(recipients).toHaveLength(1);
    expect(recipients[0].issueKeys).toEqual(['ABC-1', 'ABC-2']);
  });

  it('prefers Jira email over Bamboo fallback', () => {
    const resolved = resolveReporterEmail(
      { accountId: '1', displayName: 'Reporter', email: 'jira@co.com' },
      [{ id: '9', displayName: 'Reporter', workEmail: 'bamboo@co.com' }],
    );
    expect(resolved.source).toBe('jira');
    expect(resolved.email).toBe('jira@co.com');
  });

  it('does not merge different reporters with the same display name', () => {
    const recipients = aggregateSurveyRecipients(
      [
        {
          key: 'ABC-1',
          summary: 'One',
          projectKey: 'ABC',
          assigneeAccountId: 'assignee-1',
          reporter: { accountId: 'rep-1', displayName: 'Anna Smith', email: 'anna1@co.com' },
        },
        {
          key: 'ABC-2',
          summary: 'Two',
          projectKey: 'ABC',
          assigneeAccountId: 'assignee-1',
          reporter: { accountId: 'rep-2', displayName: 'Anna Smith', email: 'anna2@co.com' },
        },
      ],
      {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
        targetAccountIds: new Set(['assignee-1']),
        bambooRoster: [],
      },
    );

    expect(recipients).toHaveLength(2);
  });

  it('prefers reporter account id for identity stability', () => {
    expect(
      recipientIdentityKey(
        { accountId: 'acct-1', displayName: 'Same Name', email: '' },
        '',
      ),
    ).toBe('acct-1');
  });

  it('does not pick ambiguous Bamboo name matches', () => {
    const resolved = resolveReporterEmail(
      { accountId: '1', displayName: 'Anna Smith', email: '' },
      [
        { id: '1', displayName: 'Anna Smith', workEmail: 'a1@co.com' },
        { id: '2', displayName: 'Anna Smith', workEmail: 'a2@co.com' },
      ],
    );
    expect(resolved.email).toBe('');
    expect(resolved.note).toMatch(/Multiple/);
  });
});

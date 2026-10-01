import { describe, expect, it } from 'vitest';
import { computeDeliveryCounts } from './deliveryMetrics';
import type { SurveyRecipient } from './types';

function recipient(status: SurveyRecipient['status']): SurveyRecipient {
  return {
    id: status,
    reporterAccountId: 'a',
    reporterName: 'A',
    reporterEmail: 'a@co.com',
    issueKeys: [],
    projects: [],
    emailSource: 'jira',
    selected: true,
    status,
    sentAt: null,
    respondedAt: null,
    gmailMessageId: null,
    sendBatchId: null,
    error: null,
    notes: null,
    lastReminderAt: null,
    reminderCount: 0,
    lastReminderError: null,
  };
}

describe('delivery metrics', () => {
  it('counts delivered as sent plus responded', () => {
    const counts = computeDeliveryCounts([
      recipient('sent'),
      recipient('responded'),
      recipient('ready'),
      recipient('no_email'),
    ]);
    expect(counts.delivered).toBe(2);
    expect(counts.waiting).toBe(1);
    expect(counts.responded).toBe(1);
    expect(counts.responseRatePercent).toBe(50);
  });
});

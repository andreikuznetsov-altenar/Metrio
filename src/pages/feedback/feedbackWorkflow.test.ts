import { describe, expect, it } from 'vitest';
import { computeDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import type { SurveyRecipient } from '../../domain/survey/types';
import {
  formatFeedbackSendSummaryToast,
  formatFeedbackLastSync,
} from './feedbackUi';

function recipient(partial: Partial<SurveyRecipient> & Pick<SurveyRecipient, 'id' | 'status'>): SurveyRecipient {
  return {
    reporterAccountId: '',
    reporterName: 'Test',
    reporterEmail: 'a@b.com',
    issueKeys: [],
    projects: [],
    emailSource: 'jira',
    selected: true,
    sentAt: null,
    respondedAt: null,
    gmailMessageId: null,
    sendBatchId: null,
    error: null,
    notes: '',
    lastReminderAt: null,
    reminderCount: 0,
    lastReminderError: null,
    ...partial,
  };
}

describe('feedbackUi formatters', () => {
  it('formats relative last sync', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatFeedbackLastSync(fiveMinAgo)).toContain('5 min ago');
  });

  it('maps send summary to toast copy', () => {
    expect(formatFeedbackSendSummaryToast('Sent 16 · Failed 0 · Skipped 2').message).toBe(
      '16 surveys sent',
    );
    expect(formatFeedbackSendSummaryToast('Sent 14 · Failed 2 · Skipped 0').variant).toBe('warning');
  });
});

describe('feedback send eligibility', () => {
  it('counts selected sendable recipients', () => {
    const recipients = [
      recipient({ id: '1', status: 'ready', reporterEmail: 'a@b.com', selected: true }),
      recipient({ id: '2', status: 'sent', reporterEmail: 'b@b.com', selected: true }),
      recipient({ id: '3', status: 'ready', reporterEmail: '', selected: true }),
      recipient({ id: '4', status: 'failed', reporterEmail: 'c@b.com', selected: true }),
    ];
    const counts = computeDeliveryCounts(recipients);
    expect(counts.ready).toBe(1);
    expect(counts.missingEmail).toBeGreaterThan(0);

    const selectedSendCount = recipients.filter(
      (r) =>
        r.selected &&
        r.status !== 'sent' &&
        r.status !== 'responded' &&
        r.status !== 'sending' &&
        r.reporterEmail,
    ).length;
    expect(selectedSendCount).toBe(2);
  });

  it('reminder count includes only sent-not-responded', () => {
    const recipients = [
      recipient({ id: '1', status: 'sent' }),
      recipient({ id: '2', status: 'responded' }),
      recipient({ id: '3', status: 'ready' }),
    ];
    const reminderCount = recipients.filter((r) => r.status === 'sent').length;
    expect(reminderCount).toBe(1);
  });
});

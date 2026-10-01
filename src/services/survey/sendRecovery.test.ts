import { describe, expect, it } from 'vitest';
import { recoverStaleSendingRecipients } from './surveyPersistence';
import type { Survey } from '../../domain/survey/types';

function surveyWithRecipient(status: Survey['recipients'][number]['status'], gmailMessageId: string | null): Survey {
  return {
    id: 's1',
    googleFormId: 'f1',
    responderUri: 'https://forms.gle/test',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    dateFrom: '2025-01-01',
    dateTo: '2025-01-31',
    scope: 'full',
    projects: [],
    title: 'T',
    emailSubject: 'S',
    introText: 'I',
    buttonLabel: 'Open',
    signature: 'Thanks',
    questions: [],
    responses: [],
    sendBatches: [],
    status: 'active',
    questionsLocked: true,
    emailsSent: true,
    lastResponseSyncAt: null,
    error: null,
    recipients: [{
      id: 'r1',
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
      gmailMessageId,
      sendBatchId: 'batch-1',
      error: null,
      notes: null,
      lastReminderAt: null,
      reminderCount: 0,
      lastReminderError: null,
    }],
  };
}

describe('send crash recovery', () => {
  it('marks stale sending with message id as sent', () => {
    const recovered = recoverStaleSendingRecipients(
      surveyWithRecipient('sending', 'msg-123'),
    );
    expect(recovered.recipients[0].status).toBe('sent');
  });

  it('marks ambiguous sending without message id as failed', () => {
    const recovered = recoverStaleSendingRecipients(
      surveyWithRecipient('sending', null),
    );
    expect(recovered.recipients[0].status).toBe('failed');
  });
});

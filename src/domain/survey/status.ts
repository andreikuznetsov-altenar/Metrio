import type { RecipientStatus, SurveyStatus } from './types';

export function recipientStatusLabel(status: RecipientStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'no_email':
      return 'No email';
    case 'sending':
      return 'Sending';
    case 'sent':
      return 'Sent';
    case 'responded':
      return 'Responded';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

export function canSendRecipient(status: RecipientStatus): boolean {
  return status === 'ready';
}

export function canRemindRecipient(status: RecipientStatus): boolean {
  return status === 'sent';
}

export function isTerminalRecipientStatus(status: RecipientStatus): boolean {
  return status === 'responded' || status === 'failed';
}

export function surveyStatusLabel(status: SurveyStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

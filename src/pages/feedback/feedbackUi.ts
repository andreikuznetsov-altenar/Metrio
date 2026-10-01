import type { SurveyIndexStatus } from '../../domain/survey/metrics';
import { recipientStatusLabel } from '../../domain/survey/status';
import type { RecipientStatus } from '../../domain/survey/types';
import type { AppPreferences } from '../../platform/preferences';

export type FeedbackTab = 'survey' | 'delivery' | 'results' | 'history';

export const FEEDBACK_TABS: { id: FeedbackTab; label: string }[] = [
  { id: 'survey', label: 'Survey' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'results', label: 'Results' },
  { id: 'history', label: 'History' },
];

export function hasGoogleAccount(prefs: AppPreferences): boolean {
  return !!prefs.google.accountEmail;
}

export function isGoogleReadyForSurveys(prefs: AppPreferences): boolean {
  return prefs.google.formsConnected;
}

export function googleIntegrationTone(connected: boolean): 'green' | 'orange' | 'grey' {
  return connected ? 'green' : 'orange';
}

export function recipientStatusTone(
  status: RecipientStatus,
): 'green' | 'blue' | 'red' | 'orange' | 'grey' {
  switch (status) {
    case 'ready':
      return 'green';
    case 'responded':
    case 'sent':
      return 'blue';
    case 'sending':
    case 'no_email':
      return 'orange';
    case 'failed':
      return 'red';
    default:
      return 'grey';
  }
}

export function recipientStatusDisplay(status: RecipientStatus): string {
  return recipientStatusLabel(status);
}

export function surveyIndexTagVariant(
  status: SurveyIndexStatus,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'Excellent':
    case 'Healthy':
      return 'success';
    case 'Watch':
      return 'warning';
    case 'Risk':
    case 'Critical':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function questionTypeLabel(type: string): string {
  switch (type) {
    case 'scale':
      return 'Scale';
    case 'paragraph':
      return 'Paragraph';
    case 'multiple':
      return 'Multiple choice';
    case 'text':
      return 'Text';
    default:
      return type;
  }
}

export function formatGoogleOAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('not configured')) return 'Google connection is not configured in this build.';
  if (lower.includes('unauthorized_client')) {
    return 'This OAuth client cannot be used for this application.';
  }
  if (lower.includes('google connection was cancelled') || lower.includes('oauth_cancelled')) {
    return 'Google connection was cancelled.';
  }
  if (lower.includes('access_denied') || lower.includes('access denied')) {
    return 'Google connection was cancelled.';
  }
  if (lower.includes('cancel')) return 'Google connection was cancelled.';
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Google authorization timed out. Try again.';
  }
  if (lower.includes('state')) return 'Google authorization failed (state mismatch). Try again.';
  if (lower.includes('callback')) return 'Google authorization callback failed. Try again.';
  if (lower.includes('refresh token')) return 'Google session expired. Reconnect your account.';
  if (lower.includes('administrator') || lower.includes('policy')) {
    return 'Your Google Workspace administrator has blocked one or more required permissions.';
  }
  if (lower.includes('forms')) return 'Google Forms permission was denied. Reconnect and allow Forms access.';
  if (lower.includes('gmail')) return 'Gmail permission was denied. Reconnect and allow Gmail access.';
  if (lower.includes('drive')) return 'Google Drive permission was denied. Reconnect and allow Drive access.';
  return message;
}

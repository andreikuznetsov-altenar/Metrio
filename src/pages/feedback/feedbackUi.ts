import type { BadgeVariant } from '../../components/Badge/Badge';
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

export function surveyIndexBadgeVariant(status: SurveyIndexStatus): BadgeVariant {
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

/** @deprecated use surveyIndexBadgeVariant */
export function surveyIndexTagVariant(
  status: SurveyIndexStatus,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const v = surveyIndexBadgeVariant(status);
  return v === 'accent' ? 'info' : v;
}

export function recipientStatusBadgeVariant(status: RecipientStatus): BadgeVariant {
  switch (status) {
    case 'ready':
      return 'success';
    case 'responded':
    case 'sent':
      return 'info';
    case 'sending':
    case 'no_email':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function formatFeedbackLastSync(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Not synced yet';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 'Not synced yet';
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Updated just now';
  if (diffMin < 60) return `Updated ${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Updated ${diffHours} h ago`;
  const date = new Date(ts);
  const sameDay = new Date(now).toDateString() === date.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Last synced today, ${time}`;
  return `Last synced ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

export function formatFeedbackSendSummaryToast(
  summary: string,
): { variant: 'success' | 'warning' | 'info'; message: string } {
  if (summary.startsWith('Sent ')) {
    const parts = summary.match(/Sent (\d+) · Failed (\d+) · Skipped (\d+)/);
    if (parts) {
      const sent = Number(parts[1]);
      const failed = Number(parts[2]);
      if (failed > 0) {
        return { variant: 'warning', message: `${sent} sent · ${failed} failed` };
      }
      return { variant: 'success', message: sent === 1 ? '1 survey sent' : `${sent} surveys sent` };
    }
  }
  if (summary.startsWith('Reminders sent:')) {
    return { variant: 'success', message: 'Reminders sent' };
  }
  if (summary.toLowerCase().includes('test sent')) {
    return { variant: 'success', message: 'Test email sent' };
  }
  if (summary.toLowerCase().includes('regenerated')) {
    return { variant: 'success', message: 'Google Form regenerated' };
  }
  return { variant: 'info', message: summary };
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

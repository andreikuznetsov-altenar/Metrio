import type { Person } from '../people/types';
import type { SurveyRecipient } from '../survey/types';

export function recipientsFromTeamMembers(
  persons: Person[],
  selectedPersonIds: string[],
): SurveyRecipient[] {
  const selected = new Set(selectedPersonIds);
  return persons
    .filter((person) => selected.has(person.id))
    .map((person) => {
      const email = person.bamboo.workEmail?.trim() || person.jira?.email?.trim() || '';
      return {
        id: `rec_${person.id}`,
        reporterAccountId: person.jira?.accountId || person.id,
        reporterName: person.bamboo.displayName,
        reporterEmail: email,
        issueKeys: [],
        projects: [],
        emailSource: email ? 'bamboo' : 'missing',
        selected: Boolean(email),
        status: email ? 'ready' : 'no_email',
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
    });
}

export function formatRecipientPreview(
  recipients: SurveyRecipient[],
  maxNames = 2,
): string {
  const withEmail = recipients.filter((r) => r.reporterEmail);
  if (!withEmail.length) return 'No recipients';
  const labels = withEmail.slice(0, maxNames).map((r) => r.reporterName || r.reporterEmail);
  const rest = withEmail.length - labels.length;
  if (rest > 0) return `${labels.join(', ')} +${rest}`;
  return labels.join(', ');
}

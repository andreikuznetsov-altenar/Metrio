import { normalizePersonName } from '../../services/bamboo/bambooClient';
import type { BambooEmployeeRecord } from '../../services/bamboo/bambooClient';
import type { EmailSource, SurveyRecipient } from './types';

export interface JiraReporterIssue {
  key: string;
  summary: string;
  projectKey: string;
  reporter: {
    accountId: string;
    displayName: string;
    email: string;
  };
  assigneeAccountId: string;
}

export interface RecipientAggregationParams {
  dateFrom: string;
  dateTo: string;
  targetAccountIds: Set<string>;
  bambooRoster: BambooEmployeeRecord[];
}

function bambooEmailByName(
  name: string,
  roster: BambooEmployeeRecord[],
): { email: string; source: EmailSource; note?: string } {
  const normalizedTarget = normalizePersonName(name);
  if (!normalizedTarget) {
    return { email: '', source: 'missing', note: 'Reporter name is empty for BambooHR lookup' };
  }

  const matches = roster.filter((emp) => {
    const possibleNames = [
      emp.displayName,
      emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : '',
      emp.preferredName && emp.lastName ? `${emp.preferredName} ${emp.lastName}` : '',
      emp.firstName && emp.surname ? `${emp.firstName} ${emp.surname}` : '',
    ]
      .map((v) => normalizePersonName(v || ''))
      .filter(Boolean);
    return possibleNames.includes(normalizedTarget);
  });

  if (matches.length === 1) {
    const email = String(matches[0].workEmail || matches[0].email || matches[0].bestEmail || '').trim();
    if (!email) {
      return { email: '', source: 'bamboo', note: 'BambooHR match found but no email field available' };
    }
    return { email, source: 'bamboo' };
  }

  if (matches.length > 1) {
    return { email: '', source: 'missing', note: 'Multiple BambooHR matches for reporter name' };
  }

  return { email: '', source: 'missing', note: 'Reporter not found in BambooHR by name' };
}

function bambooEmailByWorkEmail(
  email: string,
  roster: BambooEmployeeRecord[],
): { email: string; source: EmailSource } | null {
  const target = email.trim().toLowerCase();
  if (!target) return null;
  const match = roster.find(
    (e) => String(e.workEmail || e.email || e.bestEmail || '').trim().toLowerCase() === target,
  );
  if (!match) return null;
  const resolved = String(match.workEmail || match.email || match.bestEmail || '').trim();
  return resolved ? { email: resolved, source: 'bamboo' } : null;
}

export function resolveReporterEmail(
  reporter: JiraReporterIssue['reporter'],
  roster: BambooEmployeeRecord[],
): { email: string; source: EmailSource; note?: string } {
  if (reporter.email) {
    return { email: reporter.email.trim(), source: 'jira' };
  }

  const byEmail = bambooEmailByWorkEmail(reporter.email, roster);
  if (byEmail) return byEmail;

  if (reporter.displayName) {
    return bambooEmailByName(reporter.displayName, roster);
  }

  return { email: '', source: 'missing', note: 'Reporter email was not found' };
}

export function recipientIdentityKey(
  reporter: JiraReporterIssue['reporter'],
  resolvedEmail: string,
): string {
  if (reporter.accountId) return reporter.accountId;
  const email = resolvedEmail.trim().toLowerCase();
  if (email) return email;
  return normalizePersonName(reporter.displayName) || '';
}

export function aggregateSurveyRecipients(
  issues: JiraReporterIssue[],
  params: RecipientAggregationParams,
): SurveyRecipient[] {
  const grouped = new Map<string, SurveyRecipient>();

  for (const issue of issues) {
    if (!params.targetAccountIds.has(issue.assigneeAccountId)) continue;

    const resolved = resolveReporterEmail(issue.reporter, params.bambooRoster);
    const identityKey = recipientIdentityKey(issue.reporter, resolved.email);

    if (!identityKey) continue;

    const key = `${identityKey}|${params.dateFrom}|${params.dateTo}`;
    let row = grouped.get(key);

    if (!row) {
      const hasEmail = !!resolved.email;
      row = {
        id: key,
        reporterAccountId: issue.reporter.accountId,
        reporterName: issue.reporter.displayName,
        reporterEmail: resolved.email,
        issueKeys: [],
        projects: [],
        emailSource: resolved.source,
        selected: hasEmail,
        status: hasEmail ? 'ready' : 'no_email',
        sentAt: null,
        respondedAt: null,
        gmailMessageId: null,
        error: null,
        notes: resolved.note || null,
        lastReminderAt: null,
        reminderCount: 0,
        lastReminderError: null,
        sendBatchId: null,
      };
      grouped.set(key, row);
    }

    if (!row.reporterName && issue.reporter.displayName) {
      row.reporterName = issue.reporter.displayName;
    }
    if (!row.reporterEmail && resolved.email) {
      row.reporterEmail = resolved.email;
      row.emailSource = resolved.source;
      row.status = 'ready';
      row.selected = true;
    }
    if (!row.reporterAccountId && issue.reporter.accountId) {
      row.reporterAccountId = issue.reporter.accountId;
    }
    if (!row.notes && resolved.note) row.notes = resolved.note;

    if (!row.issueKeys.includes(issue.key)) row.issueKeys.push(issue.key);
    if (issue.projectKey && !row.projects.includes(issue.projectKey)) {
      row.projects.push(issue.projectKey);
    }
  }

  return [...grouped.values()].sort((a, b) =>
    a.reporterName.localeCompare(b.reporterName),
  );
}

export function updateRecipientEmail(
  recipient: SurveyRecipient,
  email: string,
): SurveyRecipient {
  const trimmed = email.trim();
  return {
    ...recipient,
    reporterEmail: trimmed,
    emailSource: trimmed ? 'manual' : 'missing',
    status: trimmed ? 'ready' : 'no_email',
    selected: !!trimmed,
    notes: trimmed ? null : recipient.notes,
  };
}

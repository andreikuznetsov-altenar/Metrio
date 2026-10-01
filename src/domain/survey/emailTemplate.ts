import type { SurveyConfigDefaults, SurveyRecipient } from './types';

export function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatIssueKeysPreview(issueKeys: string[]): string {
  if (!issueKeys.length) return '';
  if (issueKeys.length <= 3) return issueKeys.join(', ');
  return `${issueKeys.slice(0, 3).join(', ')} +${issueKeys.length - 3} more`;
}

export function buildSurveyEmailHtml(
  recipient: SurveyRecipient,
  formUrl: string,
  config: Pick<
    SurveyConfigDefaults,
    'title' | 'introText' | 'buttonLabel' | 'signature'
  >,
): string {
  const reporterName = recipient.reporterName || 'colleague';
  const projects = recipient.projects.join(', ');
  const issuePreview = formatIssueKeysPreview(recipient.issueKeys);

  const details: string[] = [];
  if (projects) details.push(`<strong>Project:</strong> ${escapeHtml(projects)}`);
  if (issuePreview) {
    details.push(`<strong>Related issue(s):</strong> ${escapeHtml(issuePreview)}`);
  }

  return (
    '<div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937;">' +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="padding:24px 32px 8px 32px;font-size:20px;font-weight:700;color:#111827;">' +
    escapeHtml(config.title || 'Design Team Collaboration Feedback') +
    '</td></tr>' +
    '<tr><td style="padding:0 32px 24px 32px;font-size:14px;line-height:1.65;color:#374151;">' +
    `<p style="margin:0 0 16px 0;">Hello ${escapeHtml(reporterName)},</p>` +
    `<p style="margin:0 0 16px 0;">${escapeHtml(config.introText)}</p>` +
    (details.length
      ? `<div style="margin:0 0 20px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;line-height:1.6;color:#374151;">${details.join('<br>')}</div>`
      : '') +
    '<p style="margin:0 0 24px 0;">The form should take only a few minutes to complete.</p>' +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:8px;background:#146FFB;">' +
    `<a href="${formUrl}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">` +
    escapeHtml(config.buttonLabel) +
    '</a></td></tr></table>' +
    `<p style="margin:24px 0 0 0;">${escapeHtml(config.signature)}</p>` +
    '</td></tr></table></div>'
  );
}

export function buildReminderEmailHtml(
  recipient: SurveyRecipient,
  formUrl: string,
  config: Pick<SurveyConfigDefaults, 'title'>,
): string {
  const name = recipient.reporterName || 'colleague';
  return (
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#374151;">' +
    `<p>Hello ${escapeHtml(name)},</p>` +
    `<p>This is a friendly reminder to complete the ${escapeHtml(config.title)} survey.</p>` +
    `<p><a href="${formUrl}">Open feedback form</a></p>` +
    '</div>'
  );
}

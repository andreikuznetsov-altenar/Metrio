/** Concise Feedback copy — avoid sprinkling Info icons on every field. */

export const FEEDBACK_HELP = {
  surveyScope:
    'Choose the reporting period and team scope for this survey. Feedback keeps its own draft range after you change it here.',
  responseRate:
    'Share of delivered surveys that received at least one response (responded ÷ successfully sent).',
  surveyIndex:
    'Combined health of scale and choice questions (Excellent → Critical). Based on aggregated responses only.',
  reminders:
    'Reminders go to recipients who were sent the survey but have not responded yet. Responded, failed, and missing-email recipients are skipped.',
  permissionsFootnote:
    'Metrio requests only the permissions required to create Forms, read responses, and send survey emails.',
} as const;

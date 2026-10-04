/**
 * Deterministic Feedback workflow fixture metadata for Playwright / dev QA.
 * Business logic stays in feedbackSurveyStore; transport must be mocked in E2E.
 */
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_SCHEMA_VERSION,
  type AppPreferences,
} from '../platform/preferences';

export const FEEDBACK_WORKFLOW_FIXTURE = {
  google: {
    accountEmail: 'lead@fixture.dev',
    formsConnected: true,
    gmailConnected: true,
  },
  steps: [
    'google_connected',
    'prepare_survey',
    'recipients_generated',
    'open_recipients_drawer',
    'confirm_send',
    'delivery_statuses_update',
    'results_available',
    'history_contains_survey',
  ] as const,
};

export function feedbackWorkflowFixtureSummary(): string {
  return FEEDBACK_WORKFLOW_FIXTURE.steps.join(' → ');
}

/** Seeds visual Playwright runs with a connected Google account (no real OAuth). */
export function serializeFeedbackVisualPrefsForPlaywright(): string {
  const prefs: AppPreferences = {
    ...DEFAULT_PREFERENCES,
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    teamDetection: {
      mode: 'team',
      ok: true,
      employee: null,
      fullTeam: [],
      directReports: [],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'bamboo',
      ambiguousSupervisorNames: [],
    } as unknown as AppPreferences['teamDetection'],
    google: {
      ...DEFAULT_PREFERENCES.google,
      accountEmail: FEEDBACK_WORKFLOW_FIXTURE.google.accountEmail,
      formsConnected: true,
      gmailConnected: true,
    },
  };
  return JSON.stringify(prefs);
}

/** Team lead Feedback page without Google connection (Survey tab still visible). */
export function serializeFeedbackCyclesPopulatedSurveyForPlaywright(): string {
  const now = new Date().toISOString();
  return JSON.stringify({
    schemaVersion: 2,
    defaults: {
      title: 'Design Team Collaboration Feedback',
      emailSubject: 'Feedback',
      introText: 'Intro',
      buttonLabel: 'Open',
      signature: 'Thanks',
      emailCollectionMode: 'RESPONDER_INPUT',
      responseAccess: 'anyone_with_link',
      questions: [],
    },
    surveys: [],
    activeSurveyId: null,
    cycles: [
      {
        id: 'cycle_visual_pulse',
        name: 'Team pulse',
        type: 'pulse',
        status: 'active',
        cadence: { unit: 'monthly', timezone: 'local' },
        audienceRule: { kind: 'team_direct_scope' },
        surveyTemplateId: 'tpl_team_pulse',
        confidentiality: 'identified',
        createdAt: now,
        updatedAt: now,
      },
    ],
    templates: [],
  });
}

export function serializeFeedbackDisconnectedPrefsForPlaywright(): string {
  const prefs: AppPreferences = {
    ...DEFAULT_PREFERENCES,
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    teamDetection: {
      mode: 'team',
      ok: true,
      employee: null,
      fullTeam: [],
      directReports: [],
      missingFields: [],
      restrictedFields: [],
      diagnostics: [],
      reportingSource: 'bamboo',
      ambiguousSupervisorNames: [],
    } as unknown as AppPreferences['teamDetection'],
    google: {
      ...DEFAULT_PREFERENCES.google,
      accountEmail: '',
      formsConnected: false,
      gmailConnected: false,
      appsScriptWebAppUrl: '',
    },
  };
  return JSON.stringify(prefs);
}

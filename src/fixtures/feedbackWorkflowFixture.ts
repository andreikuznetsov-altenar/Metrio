/**
 * Deterministic Feedback workflow fixture metadata for Playwright / dev QA.
 * Business logic stays in feedbackSurveyStore; transport must be mocked in E2E.
 */
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_SCHEMA_VERSION,
  type AppPreferences,
} from '../platform/preferences';
import { createDefaultSurveyData } from '../domain/survey/defaults';

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
      appsScriptWebAppUrl: 'https://script.google.com/macros/s/visual/exec',
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

/** Active survey with recipients for Delivery / Recipients visual tests. */
export function serializeFeedbackDeliveryVisualSurveyForPlaywright(): string {
  const now = new Date().toISOString();
  const surveyId = 'survey_visual_delivery';
  const cycleId = 'cycle_visual_delivery';
  const defaults = createDefaultSurveyData();
  return JSON.stringify({
    schemaVersion: 2,
    defaults,
    activeSurveyId: surveyId,
    surveys: [
      {
        id: surveyId,
        cycleId,
        periodKey: null,
        googleFormId: 'visual-form-id',
        responderUri: 'https://docs.google.com/forms/d/visual',
        createdAt: now,
        updatedAt: now,
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        scope: 'direct',
        projects: ['UX'],
        title: defaults.title,
        emailSubject: defaults.emailSubject,
        introText: defaults.introText,
        buttonLabel: defaults.buttonLabel,
        signature: defaults.signature,
        questions: defaults.questions,
        recipients: [
          {
            id: 'recipient_visual_1',
            reporterAccountId: 'person-02',
            reporterName: 'Daria Chernova',
            reporterEmail: 'daria.chernova@altenar.com',
            issueKeys: ['UX-6124'],
            projects: ['UX'],
            emailSource: 'jira',
            selected: true,
            status: 'ready',
            sentAt: null,
            respondedAt: null,
            gmailMessageId: null,
            sendBatchId: null,
            error: null,
            notes: null,
            lastReminderAt: null,
            reminderCount: 0,
            lastReminderError: null,
          },
          {
            id: 'recipient_visual_2',
            reporterAccountId: 'person-03',
            reporterName: 'Nikita Volkov',
            reporterEmail: 'nikita.volkov@altenar.com',
            issueKeys: ['UX-5446'],
            projects: ['UX'],
            emailSource: 'jira',
            selected: true,
            status: 'sent',
            sentAt: now,
            respondedAt: null,
            gmailMessageId: null,
            sendBatchId: null,
            error: null,
            notes: null,
            lastReminderAt: null,
            reminderCount: 0,
            lastReminderError: null,
          },
        ],
        responses: [],
        sendBatches: [],
        status: 'ready',
        questionsLocked: true,
        emailsSent: false,
        lastResponseSyncAt: null,
        error: null,
      },
    ],
    cycles: [
      {
        id: cycleId,
        name: 'Delivery feedback',
        type: 'team',
        status: 'active',
        currentRunId: surveyId,
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

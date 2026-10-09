import { create } from 'zustand';
import { buildSurveyMetricsSummary } from '../domain/survey/metrics';
import { buildReminderEmailHtml, buildSurveyEmailHtml } from '../domain/survey/emailTemplate';
import {
  extractRespondentEmail,
  mapGoogleFormResponse,
  matchResponseToRecipient,
  mergeResponses,
  responseSubmittedAt,
} from '../domain/survey/responses';
import { updateRecipientEmail } from '../domain/survey/recipients';
import { buildResponseSyncFilter } from '../domain/survey/syncFilter';
import { validatePrepareSurvey } from '../domain/survey/validation';
import type { Survey, SurveyDataFile, SurveyRecipient, SurveySendBatch } from '../domain/survey/types';
import { discoverSurveyRecipients } from '../services/survey/recipientDiscovery';
import { connectAppsScriptGoogle } from '../services/survey/appsScriptSurveyClient';
import {
  createSurveyGoogleClient,
} from '../services/survey/surveyGoogleClient';
import { applyProductConfig, resolveBambooSubdomain, resolveJiraBaseUrl } from '../config/product';
import { getFeedbackPrefsSnapshot } from './feedbackPrefsBridge';
import { createDefaultSurveyData } from '../domain/survey/defaults';
import {
  createSendBatchId,
  createSurveyFromDefaults,
  loadSurveyData,
  recoverStaleSendingRecipients,
  saveSurveyData,
} from '../services/survey/surveyPersistence';
import {
  createCycleWithFirstRun,
  deleteFeedbackCycle,
  repeatCycleRun,
  type NewFeedbackSurveyInput,
} from '../domain/feedbackV2/operations';
import {
  ensureGoogleFormForSurvey,
  regenerateGoogleFormForSurvey,
} from '../services/survey/surveyFormService';
import { BambooClient } from '../services/bamboo/bambooClient';
import { JiraClient } from '../services/jira/jiraClient';
import type { TeamSnapshot } from '../domain/people/types';
import type { OrgResolutionResult } from '../services/bamboo/orgResolver';
import type { AppPreferences } from '../platform/preferences';

const REMINDER_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
let responseSyncInFlight: Promise<void> | null = null;

interface SurveyState {
  data: SurveyDataFile;
  loading: boolean;
  error: string | null;
  prepareIssues: Array<{ field: string; message: string }>;
  sendSummary: string | null;
  showRecipients: boolean;
  showSendConfirm: boolean;
  showReminderConfirm: boolean;
  showRegenerateConfirm: boolean;
  recipientSearch: string;
  recipientStatusFilter: string;

  init: () => Promise<void>;
  saveDefaults: (patch: Partial<SurveyDataFile['defaults']>) => Promise<void>;
  syncGoogleClientId: (prefs: AppPreferences) => void;
  connectGoogle: (input: { webAppUrl: string; bridgeSecret: string }) => Promise<
    Pick<
      AppPreferences['google'],
      'accountEmail' | 'formsConnected' | 'gmailConnected' | 'calendarConnected'
    >
  >;
  disconnectGoogle: () => Promise<void>;
  refreshGoogleStatus: () => Promise<
    Pick<
      AppPreferences['google'],
      'accountEmail' | 'formsConnected' | 'gmailConnected' | 'calendarConnected'
    >
  >;

  prepareSurvey: (input: {
    prefs: AppPreferences;
    teamSnapshot: TeamSnapshot | null;
    teamDetection: OrgResolutionResult | null;
    dateFrom: string;
    dateTo: string;
    scope: 'full' | 'direct';
    projects: string[];
  }) => Promise<Survey | null>;

  regenerateGoogleForm: (surveyId: string) => Promise<void>;
  sendTestEmail: (surveyId: string, prefs: AppPreferences) => Promise<void>;
  sendSurveyBatch: (surveyId: string, prefs: AppPreferences) => Promise<void>;
  syncResponses: (surveyId: string) => Promise<void>;
  sendReminders: (surveyId: string, prefs: AppPreferences) => Promise<void>;
  closeSurvey: (surveyId: string) => Promise<void>;
  setActiveSurvey: (surveyId: string) => void;
  updateRecipient: (surveyId: string, recipientId: string, patch: Partial<SurveyRecipient>) => Promise<void>;
  toggleRecipientSelected: (surveyId: string, recipientId: string, selected: boolean) => Promise<void>;
  resetSurveyHistory: () => Promise<void>;
  updateActiveSurvey: (surveyId: string, patch: Partial<Survey>) => Promise<void>;

  createFeedbackSurvey: (input: NewFeedbackSurveyInput) => Promise<Survey>;
  repeatFeedbackCycleRun: (cycleId: string, input: NewFeedbackSurveyInput) => Promise<Survey | null>;
  deleteFeedbackCycle: (cycleId: string) => Promise<void>;
  provisionRunGoogleForm: (surveyId: string) => Promise<Survey>;

  setShowRecipients: (open: boolean) => void;
  setShowSendConfirm: (open: boolean) => void;
  setShowReminderConfirm: (open: boolean) => void;
  setShowRegenerateConfirm: (open: boolean) => void;
  setRecipientSearch: (value: string) => void;
  setRecipientStatusFilter: (value: string) => void;
}

function activeSurvey(data: SurveyDataFile): Survey | null {
  if (!data.activeSurveyId) return null;
  return data.surveys.find((s) => s.id === data.activeSurveyId) || null;
}

function patchSurvey(data: SurveyDataFile, surveyId: string, patch: Partial<Survey>): SurveyDataFile {
  return {
    ...data,
    surveys: data.surveys.map((s) =>
      s.id === surveyId ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
    ),
  };
}

function surveyClient(prefs = getFeedbackPrefsSnapshot()) {
  return createSurveyGoogleClient(prefs);
}

export const useFeedbackSurveyStore = create<SurveyState>((set, get) => ({
  data: { defaults: createDefaultSurveyData(), surveys: [], activeSurveyId: null },
  loading: false,
  error: null,
  prepareIssues: [],
  sendSummary: null,
  showRecipients: false,
  showSendConfirm: false,
  showReminderConfirm: false,
  showRegenerateConfirm: false,
  recipientSearch: '',
  recipientStatusFilter: 'all',

  init: async () => {
    const loaded = await loadSurveyData();
    const surveys = loaded.surveys.map((survey) => recoverStaleSendingRecipients(survey));
    const data = { ...loaded, surveys };
    if (JSON.stringify(data.surveys) !== JSON.stringify(loaded.surveys)) {
      await saveSurveyData(data);
    }
    set({ data });
  },

  saveDefaults: async (patch) => {
    const current = get().data;
    const active = activeSurvey(current);
    if (active && ['prepared', 'ready', 'sending', 'active'].includes(active.status)) {
      throw new Error('Edit the prepared survey directly — defaults apply to the next survey only.');
    }
    const data = { ...current, defaults: { ...current.defaults, ...patch } };
    await saveSurveyData(data);
    set({ data });
  },

  syncGoogleClientId: () => undefined,

  connectGoogle: async (input) => {
    set({ loading: true, error: null });
    try {
      const prefs = getFeedbackPrefsSnapshot();
      const bridgeUrl = input.webAppUrl.trim() || prefs.google.appsScriptWebAppUrl.trim();
      if (!bridgeUrl) {
        throw new Error('Apps Script Web App URL is required.');
      }
      const status = await connectAppsScriptGoogle(bridgeUrl, input.bridgeSecret);
      set({ loading: false });
      return {
        accountEmail: status.account_email,
        formsConnected: status.forms_connected,
        gmailConnected: status.gmail_connected,
        calendarConnected: status.calendar_connected ?? false,
      };
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  disconnectGoogle: async () => {
    await surveyClient().disconnect();
  },

  refreshGoogleStatus: async () => {
    const status = await surveyClient().getStatus();
    return {
      accountEmail: status.account_email,
      formsConnected: status.forms_connected,
      gmailConnected: status.gmail_connected,
      calendarConnected: status.calendar_connected ?? false,
    };
  },

  prepareSurvey: async (input) => {
    const resolvedPrefs = applyProductConfig(input.prefs);
    const issues = validatePrepareSurvey({
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      jiraConfigured: !!(resolveJiraBaseUrl(resolvedPrefs) && resolvedPrefs.jiraEmail),
      bambooConfigured: !!resolveBambooSubdomain(resolvedPrefs),
      teamDetected: !!input.teamSnapshot && !!input.teamDetection?.ok,
      googleConnected: resolvedPrefs.google.formsConnected,
      defaults: get().data.defaults,
    });

    if (issues.length) {
      set({ prepareIssues: issues, error: issues[0]?.message || 'Survey configuration is incomplete.' });
      return null;
    }

    if (!input.teamSnapshot || !input.teamDetection?.ok) {
      throw new Error('Team detection is required before preparing a survey.');
    }

    set({ loading: true, error: null, prepareIssues: [] });
    try {
      const jiraClient = new JiraClient({
        baseUrl: resolveJiraBaseUrl(resolvedPrefs),
        email: resolvedPrefs.jiraEmail,
      });
      const bambooClient = new BambooClient({ subdomain: resolveBambooSubdomain(resolvedPrefs) });
      const recipients = await discoverSurveyRecipients({
        jiraClient,
        bambooClient,
        teamSnapshot: input.teamSnapshot,
        teamDetection: input.teamDetection,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        scope: input.scope,
        projects: input.projects,
      });

      const defaults = {
        ...get().data.defaults,
        emailCollectionMode: resolvedPrefs.google.emailCollectionMode,
        responseAccess: resolvedPrefs.google.responseAccess,
      };

      let survey = createSurveyFromDefaults({ ...get().data, defaults }, {
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        scope: input.scope,
        projects: input.projects,
      });
      survey.recipients = recipients;
      survey.status = recipients.length ? 'prepared' : 'draft';

      const client = surveyClient();
      survey = await ensureGoogleFormForSurvey(client, survey, defaults);

      const data = {
        ...get().data,
        surveys: [survey, ...get().data.surveys],
        activeSurveyId: survey.id,
      };
      await saveSurveyData(data);
      set({ data, loading: false, showRecipients: true });
      return survey;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  regenerateGoogleForm: async (surveyId) => {
    const data = get().data;
    const survey = data.surveys.find((s) => s.id === surveyId);
    if (!survey) return;

    const client = surveyClient();
    set({ loading: true, error: null, showRegenerateConfirm: false });
    try {
      const nextSurvey = await regenerateGoogleFormForSurvey(client, survey, data.defaults);
      const next = patchSurvey(data, surveyId, nextSurvey);
      await saveSurveyData(next);
      set({ data: next, loading: false, sendSummary: 'Google Form regenerated. Previously sent links may still work.' });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  sendTestEmail: async (surveyId, prefs) => {
    const data = get().data;
    const survey = data.surveys.find((s) => s.id === surveyId);
    if (!survey?.responderUri) throw new Error('Survey form is not ready.');
    const client = surveyClient();
    const status = await client.getStatus();
    const email = status.account_email || prefs.google.accountEmail;
    if (!email) throw new Error('Connected Google account email is unavailable.');

    const html = buildSurveyEmailHtml(
      {
        id: 'test',
        reporterAccountId: '',
        reporterName: 'Test recipient',
        reporterEmail: email,
        issueKeys: survey.recipients[0]?.issueKeys || [],
        projects: survey.recipients[0]?.projects || [],
        emailSource: 'manual',
        selected: true,
        status: 'ready',
        sentAt: null,
        respondedAt: null,
        gmailMessageId: null,
        sendBatchId: null,
        error: null,
        notes: 'Test email',
        lastReminderAt: null,
        reminderCount: 0,
        lastReminderError: null,
      },
      survey.responderUri,
      survey,
    );
    await client.sendEmail(email, survey.emailSubject, html);
    set({ sendSummary: `Test sent successfully to ${email}` });
  },

  sendSurveyBatch: async (surveyId, prefs) => {
    void prefs;
    const data = get().data;
    let survey = data.surveys.find((s) => s.id === surveyId);
    if (!survey?.responderUri) throw new Error('Survey form is not ready.');

    const client = surveyClient();
    set({ loading: true, error: null, showSendConfirm: false });

    const batchId = createSendBatchId();
    const batch: SurveySendBatch = {
      id: batchId,
      surveyId,
      startedAt: new Date().toISOString(),
      completedAt: null,
      requestedCount: 0,
      sentCount: 0,
      failedCount: 0,
    };

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    survey = {
      ...survey,
      sendBatches: [...survey.sendBatches, batch],
      status: 'sending',
    };
    let nextData = patchSurvey(data, surveyId, survey);
    await saveSurveyData(nextData);
    set({ data: nextData });

    for (const recipient of survey.recipients) {
      if (!recipient.selected) {
        skipped++;
        continue;
      }
      if (recipient.status === 'sent' || recipient.status === 'responded' || recipient.status === 'sending') {
        skipped++;
        continue;
      }
      if (!recipient.reporterEmail) {
        skipped++;
        continue;
      }

      batch.requestedCount += 1;

      const sendingRecipient = {
        ...recipient,
        status: 'sending' as const,
        sendBatchId: batchId,
        error: null,
      };
      survey = {
        ...survey,
        recipients: survey.recipients.map((r) => (r.id === recipient.id ? sendingRecipient : r)),
      };
      nextData = patchSurvey(get().data, surveyId, survey);
      await saveSurveyData(nextData);
      set({ data: nextData });

      try {
        const html = buildSurveyEmailHtml(recipient, survey.responderUri!, survey);
        const messageId = await client.sendEmail(
          recipient.reporterEmail,
          survey.emailSubject,
          html,
        );
        const sentRecipient = {
          ...sendingRecipient,
          status: 'sent' as const,
          sentAt: new Date().toISOString(),
          gmailMessageId: messageId,
          error: null,
        };
        survey = {
          ...survey,
          recipients: survey.recipients.map((r) => (r.id === recipient.id ? sentRecipient : r)),
        };
        batch.sentCount += 1;
        sent++;
      } catch (e) {
        const failedRecipient = {
          ...sendingRecipient,
          status: 'failed' as const,
          error: e instanceof Error ? e.message : String(e),
        };
        survey = {
          ...survey,
          recipients: survey.recipients.map((r) => (r.id === recipient.id ? failedRecipient : r)),
        };
        batch.failedCount += 1;
        failed++;
      }

      nextData = patchSurvey(get().data, surveyId, survey);
      await saveSurveyData(nextData);
      set({ data: nextData });
    }

    const completedBatch = { ...batch, completedAt: new Date().toISOString() };
    const finalSurvey = {
      ...survey,
      sendBatches: survey.sendBatches.map((b) => (b.id === batch.id ? completedBatch : b)),
      status: 'active' as const,
      emailsSent: true,
      questionsLocked: true,
    };
    const finalData = patchSurvey(get().data, surveyId, finalSurvey);
    await saveSurveyData(finalData);
    set({
      data: finalData,
      loading: false,
      sendSummary: `Sent ${sent} · Failed ${failed} · Skipped ${skipped}`,
    });
  },

  syncResponses: async (surveyId) => {
    if (responseSyncInFlight) return responseSyncInFlight;

    responseSyncInFlight = (async () => {
      const data = get().data;
      const survey = data.surveys.find((s) => s.id === surveyId);
      if (!survey?.googleFormId) return;

      const client = surveyClient();
      const filter = buildResponseSyncFilter(survey.lastResponseSyncAt);

      let pageToken: string | undefined;
      const incoming: Array<{
        mapped: ReturnType<typeof mapGoogleFormResponse>;
        respondentEmail: string;
        submittedAt: string;
      }> = [];

      do {
        const page = await client.listResponses(survey.googleFormId, filter, pageToken);
        for (const raw of page.responses) {
          const record = raw as Record<string, unknown>;
          incoming.push({
            mapped: mapGoogleFormResponse(record, survey.questions),
            respondentEmail: extractRespondentEmail(record),
            submittedAt: responseSubmittedAt(record),
          });
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      const responses = mergeResponses(survey.responses, incoming.map((item) => item.mapped));
      const recipients = survey.recipients.map((r) => {
        const matched = incoming.find((item) =>
          matchResponseToRecipient(item.mapped, item.respondentEmail, r.reporterEmail),
        );
        if (matched && (r.status === 'sent' || r.status === 'responded')) {
          return {
            ...r,
            status: 'responded' as const,
            respondedAt: matched.submittedAt,
          };
        }
        return r;
      });

      const next = patchSurvey(data, surveyId, {
        responses,
        recipients,
        lastResponseSyncAt: new Date().toISOString(),
        status: survey.status === 'ready' ? 'active' : survey.status,
      });
      await saveSurveyData(next);
      set({ data: next });
    })().finally(() => {
      responseSyncInFlight = null;
    });

    return responseSyncInFlight;
  },

  sendReminders: async (surveyId, prefs) => {
    void prefs;
    const data = get().data;
    let survey = data.surveys.find((s) => s.id === surveyId);
    if (!survey?.responderUri) return;

    const client = surveyClient();
    const responderUri = survey.responderUri;
    set({ loading: true, error: null, showReminderConfirm: false });

    let sent = 0;
    let failed = 0;
    const now = Date.now();

    for (const recipient of survey.recipients) {
      if (recipient.status !== 'sent') continue;
      if (
        recipient.lastReminderAt &&
        now - new Date(recipient.lastReminderAt).getTime() < REMINDER_MIN_INTERVAL_MS
      ) {
        continue;
      }

      try {
        const html = buildReminderEmailHtml(recipient, responderUri, survey);
        await client.sendEmail(recipient.reporterEmail, `Reminder: ${survey.emailSubject}`, html);
        const updated = {
          ...recipient,
          lastReminderAt: new Date().toISOString(),
          reminderCount: recipient.reminderCount + 1,
          lastReminderError: null,
        };
        survey = {
          ...survey,
          recipients: survey.recipients.map((r) => (r.id === recipient.id ? updated : r)),
        };
        sent++;
      } catch (e) {
        const updated = {
          ...recipient,
          lastReminderError: e instanceof Error ? e.message : String(e),
        };
        survey = {
          ...survey,
          recipients: survey.recipients.map((r) => (r.id === recipient.id ? updated : r)),
        };
        failed++;
      }

      const nextData = patchSurvey(get().data, surveyId, survey);
      await saveSurveyData(nextData);
      set({ data: nextData });
    }

    set({
      loading: false,
      sendSummary: `Reminders sent: ${sent}${failed ? ` · Failed: ${failed}` : ''}`,
    });
  },

  closeSurvey: async (surveyId) => {
    const data = get().data;
    const survey = data.surveys.find((s) => s.id === surveyId);
    if (survey?.googleFormId) {
      const client = surveyClient();
      if (client.closeForm) {
        await client.closeForm(survey.googleFormId);
      } else {
        await client.publishForm(survey.googleFormId, data.defaults.emailCollectionMode, false);
      }
    }
    const next = patchSurvey(data, surveyId, { status: 'closed' });
    await saveSurveyData(next);
    set({ data: next });
  },

  setActiveSurvey: (surveyId) => {
    const data = { ...get().data, activeSurveyId: surveyId };
    saveSurveyData(data);
    set({ data });
  },

  updateRecipient: async (surveyId, recipientId, patch) => {
    const data = get().data;
    const survey = data.surveys.find((s) => s.id === surveyId);
    if (!survey) return;
    const recipients = survey.recipients.map((r) => {
      if (r.id !== recipientId) return r;
      if (patch.reporterEmail !== undefined) {
        return updateRecipientEmail({ ...r, ...patch }, patch.reporterEmail);
      }
      return { ...r, ...patch };
    });
    const next = patchSurvey(data, surveyId, { recipients });
    await saveSurveyData(next);
    set({ data: next });
  },

  toggleRecipientSelected: async (surveyId, recipientId, selected) => {
    await get().updateRecipient(surveyId, recipientId, { selected });
  },

  resetSurveyHistory: async () => {
    const data = {
      ...get().data,
      surveys: [],
      activeSurveyId: null,
    };
    await saveSurveyData(data);
    set({ data, sendSummary: 'Local survey history cleared.' });
  },

  updateActiveSurvey: async (surveyId, patch) => {
    const data = get().data;
    const survey = data.surveys.find((s) => s.id === surveyId);
    if (!survey) return;
    if (survey.emailsSent && (patch.questions || patch.title || patch.introText)) {
      throw new Error('Structural survey changes are locked after emails have been sent.');
    }
    const next = patchSurvey(data, surveyId, patch);
    await saveSurveyData(next);
    set({ data: next });
  },

  provisionRunGoogleForm: async (surveyId) => {
    const data = get().data;
    const survey = data.surveys.find((s) => s.id === surveyId);
    if (!survey) throw new Error('Survey run not found.');
    set({ loading: true, error: null });
    try {
      const client = surveyClient();
      const nextSurvey = await ensureGoogleFormForSurvey(client, survey, data.defaults);
      const next = patchSurvey(data, surveyId, nextSurvey);
      await saveSurveyData(next);
      set({ data: next, loading: false });
      return nextSurvey;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  createFeedbackSurvey: async (input) => {
    set({ loading: true, error: null });
    try {
      const created = createCycleWithFirstRun(get().data, input);
      await saveSurveyData(created.data);
      set({ data: created.data, loading: false });
      const client = surveyClient();
      const provisioned = await ensureGoogleFormForSurvey(
        client,
        created.run,
        created.data.defaults,
      );
      const next = patchSurvey(created.data, created.run.id, provisioned);
      await saveSurveyData(next);
      set({ data: next });
      return provisioned;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  repeatFeedbackCycleRun: async (cycleId, input) => {
    set({ loading: true, error: null });
    try {
      const repeated = repeatCycleRun(get().data, cycleId, input);
      if (!repeated) {
        set({ loading: false });
        return null;
      }
      await saveSurveyData(repeated.data);
      set({ data: repeated.data, loading: false });
      const client = surveyClient();
      const provisioned = await ensureGoogleFormForSurvey(
        client,
        repeated.run,
        repeated.data.defaults,
      );
      const next = patchSurvey(repeated.data, repeated.run.id, provisioned);
      await saveSurveyData(next);
      set({ data: next });
      return provisioned;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  deleteFeedbackCycle: async (cycleId) => {
    const next = deleteFeedbackCycle(get().data, cycleId);
    await saveSurveyData(next);
    set({ data: next });
  },

  setShowRecipients: (open) => set({ showRecipients: open }),
  setShowSendConfirm: (open) => set({ showSendConfirm: open }),
  setShowReminderConfirm: (open) => set({ showReminderConfirm: open }),
  setShowRegenerateConfirm: (open) => set({ showRegenerateConfirm: open }),
  setRecipientSearch: (value) => set({ recipientSearch: value }),
  setRecipientStatusFilter: (value) => set({ recipientStatusFilter: value }),
}));

export function getSurveyMetrics(data: SurveyDataFile) {
  const survey = activeSurvey(data);
  if (!survey) return null;
  return buildSurveyMetricsSummary(survey.questions, survey.responses);
}

export async function syncActiveSurveyResponses(data: SurveyDataFile): Promise<void> {
  if (!data.activeSurveyId) return;
  const survey = data.surveys.find((s) => s.id === data.activeSurveyId);
  if (!survey || survey.status !== 'active') return;
  await useFeedbackSurveyStore.getState().syncResponses(data.activeSurveyId);
}

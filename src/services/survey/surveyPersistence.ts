import { invoke } from '@tauri-apps/api/core';
import { createDefaultSurveyData } from '../../domain/survey/defaults';
import type {
  RecipientStatus,
  Survey,
  SurveyDataFile,
  SurveyQuestion,
  SurveyRecipient,
} from '../../domain/survey/types';

export const SURVEY_DATA_SCHEMA_VERSION = 1;

export const EMPTY_SURVEY_DATA: SurveyDataFile = {
  schemaVersion: SURVEY_DATA_SCHEMA_VERSION,
  defaults: createDefaultSurveyData(),
  surveys: [],
  activeSurveyId: null,
};

function migrateQuestion(question: Partial<SurveyQuestion>): SurveyQuestion {
  return {
    id: String(question.id || ''),
    googleQuestionId: question.googleQuestionId ?? null,
    active: question.active ?? false,
    type: question.type || 'text',
    title: question.title || '',
    options: question.options || '',
    helpText: question.helpText || '',
    required: question.required ?? false,
  };
}

function migrateRecipient(recipient: Partial<SurveyRecipient>): SurveyRecipient {
  return {
    id: String(recipient.id || ''),
    reporterAccountId: recipient.reporterAccountId || '',
    reporterName: recipient.reporterName || '',
    reporterEmail: recipient.reporterEmail || '',
    issueKeys: recipient.issueKeys || [],
    projects: recipient.projects || [],
    emailSource: recipient.emailSource || 'missing',
    selected: recipient.selected ?? false,
    status: recipient.status || 'ready',
    sentAt: recipient.sentAt ?? null,
    respondedAt: recipient.respondedAt ?? null,
    gmailMessageId: recipient.gmailMessageId ?? null,
    sendBatchId: recipient.sendBatchId ?? null,
    error: recipient.error ?? null,
    notes: recipient.notes ?? null,
    lastReminderAt: recipient.lastReminderAt ?? null,
    reminderCount: recipient.reminderCount ?? 0,
    lastReminderError: recipient.lastReminderError ?? null,
  };
}

function migrateSurvey(survey: Partial<Survey>): Survey {
  const emailsSent = survey.emailsSent ?? survey.recipients?.some(
    (r) => r.status === 'sent' || r.status === 'responded' || r.status === 'sending',
  ) ?? false;

  return {
    id: String(survey.id || ''),
    googleFormId: survey.googleFormId ?? null,
    responderUri: survey.responderUri ?? null,
    createdAt: survey.createdAt || new Date().toISOString(),
    updatedAt: survey.updatedAt || new Date().toISOString(),
    dateFrom: survey.dateFrom || '',
    dateTo: survey.dateTo || '',
    scope: survey.scope || 'full',
    projects: survey.projects || [],
    title: survey.title || '',
    emailSubject: survey.emailSubject || '',
    introText: survey.introText || '',
    buttonLabel: survey.buttonLabel || '',
    signature: survey.signature || '',
    questions: (survey.questions || []).map((q) => migrateQuestion(q)),
    recipients: (survey.recipients || []).map((r) => migrateRecipient(r)),
    responses: (survey.responses || []).map((response) => ({
      responseId: response.responseId,
      createTime: response.createTime,
      lastSubmittedTime: response.lastSubmittedTime,
      answers: response.answers.map((a) => ({
        questionId: a.questionId,
        googleQuestionId: a.googleQuestionId ?? null,
        questionTitle: a.questionTitle,
        value: a.value,
      })),
    })),
    sendBatches: survey.sendBatches || [],
    status: survey.status || 'draft',
    questionsLocked: survey.questionsLocked ?? !!survey.googleFormId,
    emailsSent,
    lastResponseSyncAt: survey.lastResponseSyncAt ?? null,
    error: survey.error ?? null,
  };
}

export function migrateSurveyData(raw: Partial<SurveyDataFile>): SurveyDataFile {
  const version = raw.schemaVersion ?? 0;
  const migrated: SurveyDataFile = {
    schemaVersion: SURVEY_DATA_SCHEMA_VERSION,
    defaults: {
      ...EMPTY_SURVEY_DATA.defaults,
      ...raw.defaults,
      questions: (raw.defaults?.questions || EMPTY_SURVEY_DATA.defaults.questions).map((q) =>
        migrateQuestion(q),
      ),
    },
    surveys: (raw.surveys || []).map((s) => migrateSurvey(s)),
    activeSurveyId: raw.activeSurveyId ?? null,
  };
  if (version > SURVEY_DATA_SCHEMA_VERSION) {
    throw new Error(`Unsupported survey data schema version: ${version}`);
  }
  return migrated;
}

export async function loadSurveyData(): Promise<SurveyDataFile> {
  try {
    const raw = await invoke<Partial<SurveyDataFile>>('survey_data_load');
    return migrateSurveyData(raw);
  } catch {
    return { ...EMPTY_SURVEY_DATA };
  }
}

export async function saveSurveyData(data: SurveyDataFile): Promise<void> {
  await invoke('survey_data_save', {
    data: { ...data, schemaVersion: SURVEY_DATA_SCHEMA_VERSION },
  });
}

export function createSurveyId(): string {
  return `survey_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSendBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSurveyFromDefaults(
  data: SurveyDataFile,
  filters: {
    dateFrom: string;
    dateTo: string;
    scope: 'full' | 'direct';
    projects: string[];
  },
): Survey {
  const now = new Date().toISOString();
  return {
    id: createSurveyId(),
    googleFormId: null,
    responderUri: null,
    createdAt: now,
    updatedAt: now,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    scope: filters.scope,
    projects: filters.projects,
    title: data.defaults.title,
    emailSubject: data.defaults.emailSubject,
    introText: data.defaults.introText,
    buttonLabel: data.defaults.buttonLabel,
    signature: data.defaults.signature,
    questions: data.defaults.questions.map((q) => ({ ...q, googleQuestionId: null })),
    recipients: [],
    responses: [],
    sendBatches: [],
    status: 'draft',
    questionsLocked: false,
    emailsSent: false,
    lastResponseSyncAt: null,
    error: null,
  };
}

export function recoverStaleSendingRecipients(survey: Survey): Survey {
  const recipients = survey.recipients.map((recipient) => {
    if (recipient.status !== 'sending') return recipient;
    if (recipient.gmailMessageId) {
      return {
        ...recipient,
        status: 'sent' as RecipientStatus,
        sentAt: recipient.sentAt || new Date().toISOString(),
        error: null,
      };
    }
    return {
      ...recipient,
      status: 'failed' as RecipientStatus,
      error: recipient.error || 'Interrupted while sending — retry manually.',
    };
  });
  return { ...survey, recipients };
}

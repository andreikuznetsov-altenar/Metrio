import { invoke } from '@tauri-apps/api/core';
import { extractLastSyncAtFromGoogleFormsFilter } from '../../domain/survey/syncFilter';
import type { Survey, SurveyConfigDefaults, SurveyQuestion } from '../../domain/survey/types';
import { parseInvokeError } from '../../platform/apiTypes';
import type { SurveyGoogleClient, SurveyGoogleStatus } from './surveyGoogleClient';

interface AppsScriptStatusResponse {
  connected: boolean;
  account_email: string;
  forms_connected: boolean;
  gmail_connected: boolean;
  bridge_configured: boolean;
}

async function invokeAppsScript<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw parseInvokeError(e);
  }
}

export class AppsScriptSurveyClient implements SurveyGoogleClient {
  constructor(private readonly webAppUrl: string) {}

  async getStatus(): Promise<SurveyGoogleStatus> {
    const status = await invokeAppsScript<AppsScriptStatusResponse>('apps_script_get_status', {
      params: { web_app_url: this.webAppUrl },
    });
    return {
      account_email: status.account_email,
      forms_connected: status.forms_connected,
      gmail_connected: status.gmail_connected,
    };
  }

  async disconnect(): Promise<void> {
    await invokeAppsScript('apps_script_disconnect', {});
  }

  private async invokeAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const data = await invokeAppsScript<Record<string, unknown>>('apps_script_invoke', {
      params: {
        web_app_url: this.webAppUrl,
        action,
        payload,
      },
    });
    return data as T;
  }

  async createForm(title: string): Promise<{ formId: string; responderUri: string }> {
    const data = await this.invokeAction<{
      formId?: string;
      responderUrl?: string;
    }>('createForm', { title, questions: [] });
    return {
      formId: String(data.formId || ''),
      responderUri: String(data.responderUrl || ''),
    };
  }

  async createSurveyForm(
    survey: Survey,
    _defaults: SurveyConfigDefaults,
  ): Promise<{ formId: string; responderUri: string; questions: SurveyQuestion[] }> {
    const data = await this.invokeAction<{
      formId?: string;
      responderUrl?: string;
      questionIds?: Array<{ localId: string; googleQuestionId: string }>;
    }>('createForm', {
      title: survey.title,
      description: survey.introText,
      collectEmail: true,
      questions: survey.questions,
    });

    const questionMap = new Map(
      (data.questionIds || []).map((entry) => [entry.localId, entry.googleQuestionId]),
    );
    const questions = survey.questions.map((question) => ({
      ...question,
      googleQuestionId: questionMap.get(question.id) || question.googleQuestionId,
    }));

    const formId = String(data.formId || '').trim();
    const responderUri = String(data.responderUrl || '').trim();
    if (!formId || !responderUri) {
      throw new Error('Google Form was created without a responder URL.');
    }

    return {
      formId,
      responderUri,
      questions,
    };
  }

  async updateForm(): Promise<Record<string, unknown>> {
    return {};
  }

  async publishForm(): Promise<void> {
    return;
  }

  async setResponderAccess(): Promise<void> {
    return;
  }

  async listResponses(
    formId: string,
    filter?: string,
    _pageToken?: string,
  ): Promise<{ responses: unknown[]; nextPageToken?: string }> {
    const lastSyncAt = extractLastSyncAtFromGoogleFormsFilter(filter);
    const data = await this.invokeAction<{ responses?: unknown[] }>('listResponses', {
      formId,
      lastSyncAt,
    });
    const responses = Array.isArray(data.responses) ? data.responses : [];
    return { responses };
  }

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<string> {
    await this.invokeAction('sendTestEmail', { to, subject, htmlBody });
    return 'apps-script-mail';
  }

  async sendBatch(
    recipients: Array<{ to: string; subject: string; htmlBody: string }>,
  ): Promise<Array<{ to: string; status: 'sent' | 'failed'; error?: string }>> {
    const data = await this.invokeAction<{ results?: Array<{ to: string; status: string; error?: string }> }>(
      'sendBatch',
      { recipients },
    );
    return (data.results || []).map((entry) => ({
      to: entry.to,
      status: entry.status === 'sent' ? 'sent' : 'failed',
      error: entry.error,
    }));
  }

  async closeForm(formId: string): Promise<void> {
    await this.invokeAction('closeForm', { formId });
  }

  async trashForm(formId: string): Promise<void> {
    await this.invokeAction('trashForm', { formId });
  }
}

export async function connectAppsScriptGoogle(
  webAppUrl: string,
  bridgeSecret: string,
): Promise<SurveyGoogleStatus> {
  const status = await invokeAppsScript<AppsScriptStatusResponse>('apps_script_connect', {
    params: {
      web_app_url: webAppUrl,
      bridge_secret: bridgeSecret,
    },
  });
  return {
    account_email: status.account_email,
    forms_connected: status.forms_connected,
    gmail_connected: status.gmail_connected,
  };
}

export async function isAppsScriptBridgeConfigured(webAppUrl: string): Promise<boolean> {
  return invokeAppsScript<boolean>('apps_script_is_configured', {
    params: { web_app_url: webAppUrl },
  });
}

export function formatAppsScriptError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('invalid key')
    || lower.includes('invalid_signature')
    || lower.includes('apps_script_invalid_key')
    || lower.includes('bridge')
  ) {
    return 'Apps Script connection key is invalid. Check the key from setupMetrio().';
  }
  if (lower.includes('quota')) {
    return 'Google Mail daily quota exceeded for the Apps Script owner account.';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'Apps Script request timed out. Try again.';
  }
  if (lower.includes('unavailable') || lower.includes('html')) {
    return 'Apps Script Web App deployment is unavailable. Check deployment settings.';
  }
  if (lower.includes('authorization') || lower.includes('authorize')) {
    return 'Apps Script authorization is required. Run authorizeMetrio() in the script project.';
  }
  if (lower.includes('policy') || lower.includes('administrator')) {
    return 'Your Google Workspace policy blocked this Apps Script operation.';
  }
  return message;
}

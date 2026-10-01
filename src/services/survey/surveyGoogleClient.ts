import type { AppPreferences } from '../../platform/preferences';
import { isGoogleOAuthConfigured } from '../../config/google';
import { AppsScriptSurveyClient } from './appsScriptSurveyClient';
import { GoogleSurveyClient } from './googleSurveyClient';

export interface SurveyGoogleStatus {
  account_email: string;
  forms_connected: boolean;
  gmail_connected: boolean;
}

export interface SurveyGoogleClient {
  getStatus(): Promise<SurveyGoogleStatus>;
  disconnect(): Promise<void>;
  createForm(title: string): Promise<{ formId: string; responderUri: string }>;
  createSurveyForm?(
    survey: import('../../domain/survey/types').Survey,
    defaults: import('../../domain/survey/types').SurveyConfigDefaults,
  ): Promise<{
    formId: string;
    responderUri: string;
    questions: import('../../domain/survey/types').SurveyQuestion[];
  }>;
  updateForm(formId: string, requests: unknown[]): Promise<Record<string, unknown>>;
  publishForm(
    formId: string,
    emailCollectionType: 'VERIFIED' | 'RESPONDER_INPUT',
    acceptResponses?: boolean,
  ): Promise<void>;
  setResponderAccess(formId: string, mode: 'restricted' | 'anyone_with_link'): Promise<void>;
  listResponses(
    formId: string,
    filter?: string,
    pageToken?: string,
  ): Promise<{ responses: unknown[]; nextPageToken?: string }>;
  sendEmail(to: string, subject: string, htmlBody: string): Promise<string>;
  sendBatch?(
    recipients: Array<{ to: string; subject: string; htmlBody: string }>,
  ): Promise<Array<{ to: string; status: 'sent' | 'failed'; error?: string }>>;
  closeForm?(formId: string): Promise<void>;
  trashForm?(formId: string): Promise<void>;
}

export function usesAppsScriptGoogle(prefs: AppPreferences): boolean {
  return !!prefs.google.appsScriptWebAppUrl.trim();
}

export function createSurveyGoogleClient(prefs: AppPreferences): SurveyGoogleClient {
  if (usesAppsScriptGoogle(prefs)) {
    return new AppsScriptSurveyClient(prefs.google.appsScriptWebAppUrl);
  }
  return new GoogleSurveyClient();
}

export function isSurveyGoogleConfigured(prefs: AppPreferences): boolean {
  if (usesAppsScriptGoogle(prefs)) {
    return true;
  }
  return isGoogleOAuthConfigured(prefs.google);
}

export async function isSurveyGoogleConnected(
  prefs: AppPreferences,
): Promise<boolean> {
  if (usesAppsScriptGoogle(prefs)) {
    return prefs.google.formsConnected && prefs.google.gmailConnected;
  }
  const client = new GoogleSurveyClient();
  const status = await client.getStatus();
  return status.connected && status.forms_connected && status.gmail_connected;
}

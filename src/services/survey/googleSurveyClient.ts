import { invoke } from '@tauri-apps/api/core';
import { getGoogleOAuthClientId } from '../../config/google';
import { parseInvokeError } from '../../platform/apiTypes';

async function invokeGoogle<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw parseInvokeError(e);
  }
}

export interface GoogleAuthStatus {
  connected: boolean;
  account_email: string;
  forms_connected: boolean;
  gmail_connected: boolean;
  calendar_connected: boolean;
  oauth_client_configured: boolean;
}

export class GoogleSurveyClient {
  constructor(private clientId = getGoogleOAuthClientId()) {}

  getClientId(): string {
    return this.clientId;
  }

  async getStatus(): Promise<GoogleAuthStatus> {
    return invokeGoogle('google_get_status', {
      params: { client_id: this.clientId || null },
    });
  }

  async connect(): Promise<{ account_email: string }> {
    return invokeGoogle('google_oauth_connect', {
      params: { client_id: this.clientId || null },
    });
  }

  async enableCalendar(): Promise<{ account_email: string }> {
    return invokeGoogle('google_oauth_enable_calendar', {
      params: { client_id: this.clientId || null },
    });
  }

  async disconnect(): Promise<void> {
    await invokeGoogle('google_disconnect', {});
  }

  async createForm(title: string): Promise<{ formId: string; responderUri: string }> {
    const result = await invokeGoogle<Record<string, unknown>>('google_forms_create', {
      params: { client_id: this.clientId, title },
    });
    return {
      formId: String(result.formId || ''),
      responderUri: String(result.responderUri || ''),
    };
  }

  async updateForm(formId: string, requests: unknown[]): Promise<Record<string, unknown>> {
    const result = await invokeGoogle<Record<string, unknown>>('google_forms_update', {
      params: { client_id: this.clientId, form_id: formId, requests },
    });
    return result;
  }

  async publishForm(
    formId: string,
    emailCollectionType: 'VERIFIED' | 'RESPONDER_INPUT',
    acceptResponses = true,
  ): Promise<void> {
    await invokeGoogle('google_forms_publish', {
      params: {
        client_id: this.clientId,
        form_id: formId,
        email_collection_type: emailCollectionType,
        accept_responses: acceptResponses,
      },
    });
  }

  async setResponderAccess(
    formId: string,
    mode: 'restricted' | 'anyone_with_link',
  ): Promise<void> {
    await invokeGoogle('google_drive_set_responder_access', {
      params: {
        client_id: this.clientId,
        file_id: formId,
        mode,
      },
    });
  }

  async listResponses(
    formId: string,
    filter?: string,
    pageToken?: string,
  ): Promise<{ responses: unknown[]; nextPageToken?: string }> {
    const result = await invokeGoogle<{
      responses: unknown;
      next_page_token?: string;
    }>('google_forms_list_responses', {
      params: {
        client_id: this.clientId,
        form_id: formId,
        filter: filter || null,
        page_token: pageToken || null,
      },
    });
    const responses = Array.isArray(result.responses) ? result.responses : [];
    return { responses, nextPageToken: result.next_page_token };
  }

  async sendEmail(to: string, subject: string, htmlBody: string): Promise<string> {
    const result = await invokeGoogle<{ message_id: string }>('google_gmail_send', {
      params: {
        client_id: this.clientId,
        to,
        subject,
        html_body: htmlBody,
      },
    });
    return result.message_id;
  }
}

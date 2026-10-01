import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleSurveyClient } from './googleSurveyClient';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

describe('GoogleSurveyClient', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('sends resolved Client ID to getStatus', async () => {
    invoke.mockResolvedValue({
      connected: true,
      account_email: 'user@company.com',
      forms_connected: true,
      gmail_connected: true,
      oauth_client_configured: true,
    });

    const client = new GoogleSurveyClient('resolved-client.apps.googleusercontent.com');
    await client.getStatus();

    expect(invoke).toHaveBeenCalledWith('google_get_status', {
      params: { client_id: 'resolved-client.apps.googleusercontent.com' },
    });
  });

  it('uses the same resolved Client ID for connect and Forms calls', async () => {
    invoke.mockResolvedValue({ account_email: 'user@company.com' });

    const client = new GoogleSurveyClient('resolved-client.apps.googleusercontent.com');
    await client.connect();

    expect(invoke).toHaveBeenCalledWith('google_oauth_connect', {
      params: { client_id: 'resolved-client.apps.googleusercontent.com' },
    });

    invoke.mockResolvedValue({ formId: 'form-1', responderUri: 'https://forms.gle/test' });
    await client.createForm('Survey title');

    expect(invoke).toHaveBeenCalledWith('google_forms_create', {
      params: {
        client_id: 'resolved-client.apps.googleusercontent.com',
        title: 'Survey title',
      },
    });
  });
});

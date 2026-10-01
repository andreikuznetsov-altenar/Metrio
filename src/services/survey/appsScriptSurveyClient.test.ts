import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppsScriptSurveyClient, formatAppsScriptError } from './appsScriptSurveyClient';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

describe('AppsScriptSurveyClient', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('loads status from apps_script_get_status', async () => {
    invoke.mockResolvedValueOnce({
      connected: true,
      account_email: 'owner@company.com',
      forms_connected: true,
      gmail_connected: true,
      bridge_configured: true,
    });

    const client = new AppsScriptSurveyClient('https://script.google.com/macros/s/abc/exec');
    const status = await client.getStatus();

    expect(invoke).toHaveBeenCalledWith('apps_script_get_status', {
      params: { web_app_url: 'https://script.google.com/macros/s/abc/exec' },
    });
    expect(status.account_email).toBe('owner@company.com');
  });

  it('sends extracted lastSyncAt to listResponses', async () => {
    invoke.mockResolvedValueOnce({ responses: [] });
    const client = new AppsScriptSurveyClient('https://script.google.com/macros/s/abc/exec');
    await client.listResponses('form-1', 'timestamp >= 2026-09-29T10:00:00Z');

    expect(invoke).toHaveBeenCalledWith('apps_script_invoke', {
      params: {
        web_app_url: 'https://script.google.com/macros/s/abc/exec',
        action: 'listResponses',
        payload: {
          formId: 'form-1',
          lastSyncAt: '2026-09-29T10:00:00Z',
        },
      },
    });
  });

  it('sends null lastSyncAt when filter is invalid', async () => {
    invoke.mockResolvedValueOnce({ responses: [] });
    const client = new AppsScriptSurveyClient('https://script.google.com/macros/s/abc/exec');
    await client.listResponses('form-1', 'timestamp >= not-a-date');

    expect(invoke).toHaveBeenCalledWith('apps_script_invoke', {
      params: expect.objectContaining({
        payload: {
          formId: 'form-1',
          lastSyncAt: null,
        },
      }),
    });
  });

  it('creates a survey form through apps_script_invoke', async () => {
    invoke.mockResolvedValueOnce({
      formId: 'form-1',
      responderUrl: 'https://forms.gle/test',
      questionIds: [{ localId: 'q1', googleQuestionId: 'item-1' }],
    });

    const client = new AppsScriptSurveyClient('https://script.google.com/macros/s/abc/exec');
    const result = await client.createSurveyForm(
      {
        id: 'survey-1',
        title: 'Metrio Beta Smoke Test',
        introText: 'Intro',
        emailSubject: 'Subject',
        buttonLabel: 'Open',
        signature: 'Thanks',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        scope: 'full',
        projects: [],
        status: 'draft',
        googleFormId: null,
        responderUri: null,
        questionsLocked: false,
        emailsSent: false,
        recipients: [],
        responses: [],
        sendBatches: [],
        questions: [
          {
            id: 'q1',
            googleQuestionId: null,
            active: true,
            type: 'text',
            title: 'How was collaboration?',
            options: '',
            helpText: '',
            required: false,
          },
        ],
        error: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        lastResponseSyncAt: null,
      },
      {
        emailCollectionMode: 'RESPONDER_INPUT',
        responseAccess: 'anyone_with_link',
        surveyTitle: '',
        emailSubject: '',
        introText: '',
        buttonLabel: '',
        signature: '',
      },
    );

    expect(invoke).toHaveBeenCalledWith('apps_script_invoke', {
      params: {
        web_app_url: 'https://script.google.com/macros/s/abc/exec',
        action: 'createForm',
        payload: expect.objectContaining({
          title: 'Metrio Beta Smoke Test',
          collectEmail: true,
        }),
      },
    });
    const createCall = invoke.mock.calls[0]?.[1] as {
      params?: { payload?: Record<string, unknown> };
    };
    expect(createCall?.params?.payload?.emailCollectionMode).toBeUndefined();
    expect(createCall?.params?.payload?.responseAccess).toBeUndefined();
    expect(result.formId).toBe('form-1');
    expect(result.questions[0].googleQuestionId).toBe('item-1');
  });

  it('fails when createSurveyForm returns no responder URL', async () => {
    invoke.mockResolvedValueOnce({
      formId: 'form-1',
      responderUrl: '',
      questionIds: [],
    });
    const client = new AppsScriptSurveyClient('https://script.google.com/macros/s/abc/exec');
    await expect(
      client.createSurveyForm(
        {
          id: 'survey-1',
          title: 'Test',
          introText: '',
          emailSubject: '',
          buttonLabel: '',
          signature: '',
          dateFrom: '',
          dateTo: '',
          scope: 'full',
          projects: [],
          status: 'draft',
          googleFormId: null,
          responderUri: null,
          questionsLocked: false,
          emailsSent: false,
          recipients: [],
          responses: [],
          sendBatches: [],
          questions: [],
          error: null,
          createdAt: '',
          updatedAt: '',
          lastResponseSyncAt: null,
        },
        {
          emailCollectionMode: 'RESPONDER_INPUT',
          responseAccess: 'anyone_with_link',
          surveyTitle: '',
          emailSubject: '',
          introText: '',
          buttonLabel: '',
          signature: '',
        },
      ),
    ).rejects.toThrow('responder URL');
  });
});

describe('formatAppsScriptError', () => {
  it('maps invalid key errors', () => {
    expect(formatAppsScriptError('apps_script_invalid_key')).toContain('connection key');
  });

  it('maps quota errors', () => {
    expect(formatAppsScriptError('mail quota exceeded')).toContain('quota');
  });
});

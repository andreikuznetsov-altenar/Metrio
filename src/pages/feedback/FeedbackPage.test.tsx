// @vitest-environment jsdom
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSurveyData } from '../../domain/survey/defaults';
import type { Survey, SurveyDataFile, SurveyRecipient } from '../../domain/survey/types';
import type { FeedbackCycle } from '../../domain/feedbackCycles/feedbackCycleTypes';
import { ToastProvider } from '../../components/Toast/ToastContext';
import { FeedbackPage } from './FeedbackPage';
import { DEFAULT_PREFERENCES } from '../../platform/preferences';

const updatePrefs = vi.fn();
const connectGoogle = vi.fn();
const init = vi.fn();

const surveyStoreState = {
  data: { defaults: createDefaultSurveyData(), surveys: [], activeSurveyId: null, cycles: [] },
  loading: false,
  error: null,
  prepareIssues: [] as Array<{ field: string; message: string }>,
  sendSummary: null as string | null,
  showSendConfirm: false,
  showRecipients: false,
  showReminderConfirm: false,
  showRegenerateConfirm: false,
  recipientSearch: '',
  recipientStatusFilter: 'all',
  init,
  saveDefaults: vi.fn(),
  createFeedbackSurvey: vi.fn(),
  repeatFeedbackCycleRun: vi.fn(),
  deleteFeedbackCycle: vi.fn(),
  closeSurvey: vi.fn(),
  sendSurveyBatch: vi.fn(),
  syncResponses: vi.fn(),
  setShowSendConfirm: vi.fn(),
  connectGoogle,
  disconnectGoogle: vi.fn(),
  refreshGoogleStatus: vi.fn(),
};

const appStoreState = {
  prefs: DEFAULT_PREFERENCES,
  teamDetection: { mode: 'team' as const, ok: true, employee: null, fullTeam: [], directReports: [] },
  teamSnapshot: { mode: 'team', persons: [], summary: { available: 0, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 } },
  updatePrefs,
};

function makeRecipient(id: string, status: SurveyRecipient['status']): SurveyRecipient {
  return {
    id,
    reporterAccountId: id,
    reporterName: `Person ${id}`,
    reporterEmail: status === 'no_email' ? '' : `${id}@company.com`,
    issueKeys: [`MET-${id}`],
    projects: ['MET'],
    emailSource: status === 'no_email' ? 'missing' : 'jira',
    selected: true,
    status,
    sentAt: status === 'sent' || status === 'responded' ? '2026-10-01T10:00:00.000Z' : null,
    respondedAt: status === 'responded' ? '2026-10-02T10:00:00.000Z' : null,
    gmailMessageId: null,
    sendBatchId: null,
    error: null,
    notes: null,
    lastReminderAt: null,
    reminderCount: 0,
    lastReminderError: null,
  };
}

function makeSurvey(overrides: Partial<Survey> = {}): Survey {
  return {
    id: 'run-1',
    cycleId: 'cycle-1',
    periodKey: null,
    templateId: null,
    templateVersion: null,
    dueAt: null,
    confidentiality: 'identified',
    googleFormId: 'form-1',
    responderUri: 'https://forms.google.com/test',
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    dateFrom: '2026-09-01',
    dateTo: '2026-10-01',
    scope: 'direct',
    projects: ['MET'],
    title: 'October feedback',
    emailSubject: 'Feedback',
    introText: 'Intro',
    buttonLabel: 'Open feedback form',
    signature: 'Thanks',
    questions: [
      {
        id: 'q1',
        googleQuestionId: 'gq1',
        active: true,
        type: 'scale',
        title: 'How was collaboration?',
        options: '1|5',
        helpText: '',
        required: true,
      },
      {
        id: 'q2',
        googleQuestionId: 'gq2',
        active: true,
        type: 'paragraph',
        title: 'What should improve?',
        options: '',
        helpText: '',
        required: false,
      },
    ],
    recipients: [
      makeRecipient('a', 'ready'),
      makeRecipient('b', 'sent'),
      makeRecipient('c', 'responded'),
      makeRecipient('d', 'no_email'),
    ],
    responses: [
      {
        responseId: 'response-1',
        createTime: '2026-10-02T10:00:00.000Z',
        lastSubmittedTime: '2026-10-02T10:00:00.000Z',
        answers: [
          {
            questionId: 'q1',
            googleQuestionId: 'gq1',
            questionTitle: 'How was collaboration?',
            value: '4',
          },
        ],
      },
    ],
    sendBatches: [],
    status: 'active',
    questionsLocked: true,
    emailsSent: true,
    lastResponseSyncAt: null,
    error: null,
    ...overrides,
  };
}

function makeFeedbackData(): SurveyDataFile {
  const cycle: FeedbackCycle = {
    id: 'cycle-1',
    name: 'Team pulse',
    type: 'team',
    status: 'active',
    currentRunId: 'run-1',
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
  };
  return {
    defaults: createDefaultSurveyData(),
    surveys: [makeSurvey()],
    activeSurveyId: 'run-1',
    cycles: [cycle],
  };
}

function useConnectedPrefs() {
  appStoreState.prefs = {
    ...DEFAULT_PREFERENCES,
    google: {
      ...DEFAULT_PREFERENCES.google,
      appsScriptWebAppUrl: 'https://script.google.com/macros/s/test/exec',
      accountEmail: 'lead@company.com',
      formsConnected: true,
      gmailConnected: true,
    },
  };
}

vi.mock('../../app/FeedbackTeamProvider', () => ({
  useFeedbackAppStore: () => appStoreState,
}));

vi.mock('../../app/feedbackSurveyStore', () => ({
  useFeedbackSurveyStore: () => surveyStoreState,
  getSurveyMetrics: () => null,
}));

const currentUserState = {
  person: { id: 'lead-1', name: 'Lead', role: 'lead' as const },
  orgRole: 'leaf_manager' as const,
  team: { leadId: 'lead-1', directReportIds: ['rep-1'] },
};

vi.mock('../../app/CurrentUserContext', () => ({
  useCurrentUser: () => ({ currentUser: currentUserState }),
}));

function renderPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(ToastProvider, null, createElement(FeedbackPage)));
  });
  return { container, root };
}

describe('FeedbackPage V2', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    currentUserState.orgRole = 'leaf_manager';
    appStoreState.prefs = { ...DEFAULT_PREFERENCES };
    appStoreState.teamDetection = { mode: 'team', ok: true, employee: null, fullTeam: [], directReports: [] };
    surveyStoreState.data = { defaults: createDefaultSurveyData(), surveys: [], activeSurveyId: null, cycles: [] };
    init.mockResolvedValue(undefined);
    const rendered = renderPage();
    container = rendered.container;
    root = rendered.root;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows Feedback cycles landing without legacy top-level tabs', async () => {
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="feedback-v2-page"]')).toBeTruthy();
    expect(container.textContent).toContain('Feedback cycles');
    expect(container.textContent).toContain('New survey');
    expect(container.textContent).not.toContain('Template library');
    expect(container.textContent).not.toContain('Delivery');
    expect(container.querySelector('.performance-subnav')).toBeFalsy();
    expect(container.textContent).not.toContain('Connect Google to send surveys');
  });

  it('prompts Apps Script setup when bridge is not configured', async () => {
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Set up Google Forms');
    expect(container.textContent).toContain('Google Forms is not connected.');
    expect(container.textContent).toContain('Set up the Apps Script bridge to create and send this survey.');
    expect(document.body.textContent).toContain('Open Apps Script');
    expect(document.body.textContent).toContain('Create and deploy Metrio bridge');
    expect(document.body.textContent).toContain('Copy Web App URL');
    expect(document.body.textContent).toContain('Enter connection details');
    expect(document.body.textContent).toContain('Test connection');
  });

  it('does not show legacy Survey tab when bridge is ready', async () => {
    appStoreState.prefs = {
      ...DEFAULT_PREFERENCES,
      google: {
        ...DEFAULT_PREFERENCES.google,
        appsScriptWebAppUrl: 'https://script.google.com/macros/s/test/exec',
        accountEmail: 'lead@company.com',
        formsConnected: true,
        gmailConnected: true,
      },
    };
    act(() => {
      root.render(createElement(ToastProvider, null, createElement(FeedbackPage)));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).not.toContain('History');
    expect(container.querySelector('.performance-subnav')).toBeFalsy();
  });

  it('opens a feedback cycle in a drawer while keeping the cycle list mounted', async () => {
    useConnectedPrefs();
    surveyStoreState.data = makeFeedbackData();
    act(() => {
      root.render(createElement(ToastProvider, null, createElement(FeedbackPage)));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const open = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Open');
    expect(open).toBeTruthy();
    act(() => {
      open!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="feedback-cycles-v2"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="feedback-cycle-detail"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Back');
    expect(document.body.textContent).toContain('Overview');
    expect(document.body.textContent).toContain('Trends');
    expect(document.body.textContent).toContain('Runs');
  });

  it('opens run detail within the drawer and keeps delivery/results canonical', async () => {
    useConnectedPrefs();
    surveyStoreState.data = makeFeedbackData();
    act(() => {
      root.render(createElement(ToastProvider, null, createElement(FeedbackPage)));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const openRun = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Open run');
    expect(openRun).toBeTruthy();
    act(() => {
      openRun!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.querySelector('[data-testid="feedback-run-workspace"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Delivery');
    expect(document.body.textContent).toContain('Recipients');
    expect(document.body.textContent).toContain('Ready');
    expect(document.body.textContent).toContain('Missing email');
    expect(document.body.textContent).toContain('Sent');
    expect(document.body.textContent).toContain('Responded');
    expect(document.body.querySelectorAll('.feedback-run-workspace__results-head h3')).toHaveLength(1);
    expect(document.body.querySelectorAll('.feedback-run-workspace .feedback-ds__metric')).toHaveLength(4);
    expect(document.body.textContent).not.toContain('Back');
  });
});

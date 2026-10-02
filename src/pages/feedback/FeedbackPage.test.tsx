// @vitest-environment jsdom
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSurveyData } from '../../domain/survey/defaults';
import { ToastProvider } from '../../components/Toast/ToastContext';
import { FeedbackPage } from './FeedbackPage';
import { DEFAULT_PREFERENCES } from '../../platform/preferences';

const updatePrefs = vi.fn();
const connectGoogle = vi.fn();
const disconnectGoogle = vi.fn();
const refreshGoogleStatus = vi.fn();
const init = vi.fn();

const surveyStoreState = {
  data: { defaults: createDefaultSurveyData(), surveys: [], activeSurveyId: null },
  loading: false,
  error: null,
  prepareIssues: [] as Array<{ field: string; message: string }>,
  sendSummary: null as string | null,
  showRecipients: false,
  showSendConfirm: false,
  showReminderConfirm: false,
  showRegenerateConfirm: false,
  recipientSearch: '',
  recipientStatusFilter: 'all',
  init,
  saveDefaults: vi.fn(),
  prepareSurvey: vi.fn(),
  regenerateGoogleForm: vi.fn(),
  sendTestEmail: vi.fn(),
  sendSurveyBatch: vi.fn(),
  syncResponses: vi.fn(),
  sendReminders: vi.fn(),
  setShowRecipients: vi.fn(),
  setShowSendConfirm: vi.fn(),
  setShowReminderConfirm: vi.fn(),
  setShowRegenerateConfirm: vi.fn(),
  setRecipientSearch: vi.fn(),
  setRecipientStatusFilter: vi.fn(),
  setActiveSurvey: vi.fn(),
  updateRecipient: vi.fn(),
  updateActiveSurvey: vi.fn(),
  connectGoogle,
  disconnectGoogle,
  refreshGoogleStatus,
};

const appStoreState = {
  prefs: DEFAULT_PREFERENCES,
  teamDetection: { mode: 'team' as const, ok: true, employee: null, fullTeam: [], directReports: [] },
  teamSnapshot: null,
  updatePrefs,
};

vi.mock('../../app/FeedbackTeamProvider', () => ({
  useFeedbackAppStore: () => appStoreState,
}));

vi.mock('../../app/feedbackSurveyStore', () => ({
  useFeedbackSurveyStore: () => surveyStoreState,
  getSurveyMetrics: () => null,
}));


function renderPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(ToastProvider, null, createElement(FeedbackPage)),
    );
  });
  return { container, root };
}

describe('FeedbackPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    appStoreState.prefs = { ...DEFAULT_PREFERENCES };
    appStoreState.teamDetection = { mode: 'team', ok: true, employee: null, fullTeam: [], directReports: [] };
    surveyStoreState.loading = false;
    surveyStoreState.error = null;
    surveyStoreState.prepareIssues = [];
    init.mockResolvedValue(undefined);
    const rendered = renderPage();
    container = rendered.container;
    root = rendered.root;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows connect state when Google is not linked', async () => {
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain(
      'Create and send team feedback surveys using Google Forms and Gmail',
    );
    expect(container.querySelector('.performance-subnav')).toBeFalsy();
  });

  it('shows team-only message outside team mode', async () => {
    appStoreState.teamDetection = { mode: 'personal', ok: true, employee: null, fullTeam: [], directReports: [] };
    act(() => {
      root.render(createElement(ToastProvider, null, createElement(FeedbackPage)));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Feedback is available to team leads');
  });

  it('shows survey tabs when Google forms are connected', async () => {
    appStoreState.prefs = {
      ...DEFAULT_PREFERENCES,
      google: {
        ...DEFAULT_PREFERENCES.google,
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
    expect(container.querySelector('.performance-subnav')).toBeTruthy();
    expect(container.textContent).toContain('Survey');
    expect(container.textContent).toContain('Delivery');
    expect(container.textContent).toContain('Google Workspace');
  });

  it('shows compact strip when Google is linked', async () => {
    appStoreState.prefs = {
      ...DEFAULT_PREFERENCES,
      google: {
        ...DEFAULT_PREFERENCES.google,
        accountEmail: 'lead@company.com',
        formsConnected: true,
        gmailConnected: false,
      },
    };
    act(() => {
      root.render(createElement(ToastProvider, null, createElement(FeedbackPage)));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('lead@company.com');
    expect(container.querySelector('.feedback-google-strip')).toBeTruthy();
  });
});

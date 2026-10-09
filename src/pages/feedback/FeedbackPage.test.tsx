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
});

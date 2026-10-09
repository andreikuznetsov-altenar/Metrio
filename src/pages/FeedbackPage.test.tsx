import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast/ToastContext";
import { DEFAULT_PREFERENCES } from "../platform/preferences";
import { FeedbackPage } from "./FeedbackPage";
import { createDefaultSurveyData } from "../domain/survey/defaults";

const connectedPrefs = {
  ...DEFAULT_PREFERENCES,
  google: {
    ...DEFAULT_PREFERENCES.google,
    appsScriptWebAppUrl: "https://script.google.com/macros/s/test/exec",
    accountEmail: "lead@company.com",
    formsConnected: true,
    gmailConnected: true,
  },
};

vi.mock("../app/FeedbackTeamProvider", () => ({
  FeedbackTeamProvider: ({ children }: { children: React.ReactNode }) => children,
  useFeedbackAppStore: () => ({
    prefs: connectedPrefs,
    teamDetection: { ok: true, mode: "team" as const },
    teamSnapshot: {
      mode: "team",
      persons: [],
      summary: { available: 0, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
    },
    updatePrefs: vi.fn(),
  }),
}));

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: {
      person: { id: "lead-1", name: "Lead", role: "lead" },
      orgRole: "leaf_manager",
      team: { leadId: "lead-1", directReportIds: ["rep-1"] },
    },
  }),
}));

vi.mock("../app/feedbackSurveyStore", () => ({
  useFeedbackSurveyStore: () => ({
    data: {
      defaults: createDefaultSurveyData(),
      surveys: [],
      activeSurveyId: null,
      cycles: [],
    },
    loading: false,
    error: null,
    connectGoogle: vi.fn(),
    disconnectGoogle: vi.fn(),
    prepareIssues: [],
    sendSummary: null,
    showSendConfirm: false,
    init: vi.fn().mockResolvedValue(undefined),
    createFeedbackSurvey: vi.fn(),
    repeatFeedbackCycleRun: vi.fn(),
    deleteFeedbackCycle: vi.fn(),
    closeSurvey: vi.fn(),
    sendSurveyBatch: vi.fn(),
    syncResponses: vi.fn(),
    setShowSendConfirm: vi.fn(),
  }),
  getSurveyMetrics: () => null,
}));

describe("FeedbackPage", () => {
  it("renders Feedback cycles V2 landing", async () => {
    render(
      <ToastProvider>
        <FeedbackPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("feedback-v2-page")).toBeInTheDocument();
    });
    expect(screen.getByText("Feedback cycles")).toBeInTheDocument();
    expect(screen.getByTestId("feedback-new-survey")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Survey" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "History" })).not.toBeInTheDocument();
  });
});

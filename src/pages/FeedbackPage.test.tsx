import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast/ToastContext";
import { DEFAULT_PREFERENCES } from "../platform/preferences";
import { FeedbackPage } from "./FeedbackPage";

const connectedPrefs = {
  ...DEFAULT_PREFERENCES,
  google: {
    ...DEFAULT_PREFERENCES.google,
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
    teamSnapshot: null,
    updatePrefs: vi.fn(),
  }),
}));

vi.mock("../app/feedbackSurveyStore", () => ({
  useFeedbackSurveyStore: () => ({
    data: { defaults: { questions: [] }, surveys: [], activeSurveyId: null },
    loading: false,
    error: null,
    connectGoogle: vi.fn(),
    disconnectGoogle: vi.fn(),
    prepareIssues: [],
    sendSummary: null,
    showRecipients: false,
    showSendConfirm: false,
    showReminderConfirm: false,
    showRegenerateConfirm: false,
    recipientSearch: "",
    recipientStatusFilter: "all",
    init: vi.fn().mockResolvedValue(undefined),
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
  }),
  getSurveyMetrics: () => ({
    respondentCount: 0,
    scaleQuestions: [],
    multipleQuestions: [],
    overallEffectivenessIndex: 0,
    overallStatus: "Critical" as const,
  }),
}));

describe("FeedbackPage", () => {
  it("renders survey delivery results and history navigation", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <FeedbackPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Survey" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Results" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Results" }));
    expect(screen.getByText("No survey responses yet.")).toBeInTheDocument();
  });
});

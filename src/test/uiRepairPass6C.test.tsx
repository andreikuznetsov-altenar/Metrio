import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultSurveyData } from "../domain/survey/defaults";
import type { Survey } from "../domain/survey/types";

vi.mock("../app/feedbackSurveyStore", () => ({
  useFeedbackSurveyStore: () => ({
    data: { ...createDefaultSurveyData(), cycles: [], surveys: [], templates: [] },
    setActiveSurvey: vi.fn(),
    init: vi.fn(),
  }),
}));

vi.mock("../app/FeedbackTeamProvider", () => ({
  useFeedbackAppStore: () => ({ prefs: { google: {} } }),
}));

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: {
      person: { role: "lead" },
      team: { mode: "team" as const },
    },
  }),
}));

vi.mock("../app/CompanyConfigContext", () => ({
  useOptionalCompanyConfig: () => null,
}));

import { FeedbackHistoryView } from "../pages/feedback/FeedbackHistoryView";
import { FeedbackCyclesView } from "../pages/feedback/FeedbackCyclesView";

function survey(overrides: Partial<Survey> = {}): Survey {
  const base = createDefaultSurveyData();
  return {
    id: "s1",
    title: "Q3 pulse",
    dateFrom: "2026-09-04",
    dateTo: "2026-10-04",
    status: "active",
    createdAt: "2026-09-01T00:00:00.000Z",
    recipients: [
      {
        id: "r1",
        reporterName: "A",
        reporterEmail: "a@test.com",
        issueKeys: ["UX-1"],
        selected: true,
        status: "sent",
      },
      {
        id: "r2",
        reporterName: "B",
        reporterEmail: "b@test.com",
        issueKeys: ["UX-2"],
        selected: true,
        status: "responded",
      },
    ],
    questions: base.questions,
    emailsSent: true,
    questionsLocked: false,
    emailSubject: "",
    introText: "",
    responderUri: null,
    formId: null,
    lastResponseSyncAt: null,
    ...overrides,
  };
}

describe("UI repair pass 6C", () => {
  afterEach(() => cleanup());

  it("documents table inventory", () => {
    const doc = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../docs/table-inventory.md",
    );
    expect(existsSync(doc)).toBe(true);
    const text = readFileSync(doc, "utf8");
    expect(text).toContain("TeamPeopleView");
    expect(text).toContain("FeedbackHistoryView");
  });

  it("renders feedback history as a sortable table with human period dates", () => {
    render(
      <FeedbackHistoryView
        surveys={[survey()]}
        activeSurveyId="s1"
        onSelectSurvey={() => undefined}
      />,
    );
    expect(screen.getByTestId("feedback-history-table")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveClass("performance-table");
    expect(screen.getByText(/4 Sep – 4 Oct 2026/)).toBeInTheDocument();
    expect(screen.queryByText("2026-09-04")).toBeNull();
    expect(screen.getByRole("button", { name: /Period/i })).toBeInTheDocument();
  });

  it("sorts feedback history columns", async () => {
    const user = userEvent.setup();
    render(
      <FeedbackHistoryView
        surveys={[
          survey({ id: "a", title: "Alpha", dateFrom: "2026-01-01" }),
          survey({ id: "b", title: "Zulu", dateFrom: "2026-06-01" }),
        ]}
        activeSurveyId={null}
        onSelectSurvey={() => undefined}
      />,
    );
    const table = screen.getByRole("table");
    await user.click(screen.getByRole("button", { name: /Survey/i }));
    const titles = within(table).getAllByText(/Alpha|Zulu/);
    expect(titles[0].textContent).toMatch(/Alpha/);
  });

  it("hides duplicate cycle actions in intro when empty", () => {
    render(<FeedbackCyclesView />);
    expect(screen.getByTestId("feedback-cycles-empty")).toBeInTheDocument();
    const intro = screen.getByTestId("feedback-cycles");
    expect(within(intro).getAllByRole("button", { name: /New pulse cycle/i }).length).toBe(1);
  });
});

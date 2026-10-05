// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PersonBriefModel } from "../domain/personBrief/personBriefTypes";
import { TooltipProvider } from "../components/Tooltip/Tooltip";
import { PersonBriefDrawer } from "../pages/performance/PersonBriefDrawer";
import { PersonWorkRow } from "../pages/performance/PersonWorkRow";
import type { PersonWorkRowData } from "../domain/analytics/personAnalyticsWorkspace";

vi.mock("../hooks/usePersonBriefModel", () => ({
  usePersonBriefModel: vi.fn(),
}));

vi.mock("../app/PerformanceDataContext", () => ({
  usePerformanceData: vi.fn(),
}));

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("../app/feedbackSurveyStore", () => ({
  useFeedbackSurveyStore: (selector: (state: { data: null }) => unknown) =>
    selector({ data: null }),
}));

vi.mock("../app/WorkGraphContext", () => ({
  useWorkGraph: () => ({
    knowledgeByIssue: new Map(),
    knowledgeByProject: new Map(),
  }),
}));

vi.mock("../platform/preferences", () => ({
  loadPreferences: vi.fn().mockResolvedValue({
    jira: { baseUrl: "https://jira.example.com" },
  }),
}));

vi.mock("../components/Toast/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import { usePersonBriefModel } from "../hooks/usePersonBriefModel";
import { usePerformanceData } from "../app/PerformanceDataContext";
import { useCurrentUser } from "../app/CurrentUserContext";

const mockBrief = vi.mocked(usePersonBriefModel);
const mockPerformance = vi.mocked(usePerformanceData);
const mockCurrentUser = vi.mocked(useCurrentUser);

const workItem: PersonWorkRowData = {
  key: "UX-1490",
  title: "Navigation polish",
  status: "In Review",
  stageAge: "5 days",
  healthVariant: "warning",
  attentionLabel: "Long Review",
};

function briefStub(): PersonBriefModel {
  return {
    personId: "person-01",
    personName: "Alex Morgan",
    role: "Designer",
    periodPreset: "30d",
    periodLabel: "Last 30 days vs previous 30 days",
    availability: "Available",
    workload: "Normal",
    performanceKpis: [
      { label: "Completed", value: "5", contextLabel: "vs 7" },
      { label: "First pass", value: "80%" },
      { label: "Backflows", value: "1" },
    ],
    cycleTime: [{ label: "P → R", value: "2.1 days" }],
    currentWork: {
      activeCount: 1,
      inReviewCount: 1,
      problematicCount: 0,
      topTasks: [workItem],
    },
    completedWork: [],
    attention: [
      {
        label: "No activity",
        variant: "danger",
        reason: "No activity for 7+ days",
        taskCount: 3,
        issueKeys: ["UX-1", "UX-2", "UX-3"],
      },
    ],
    backflows: { count: 1, issueKeys: [] },
    feedbackLines: [],
    resources: [],
    prompts: [],
    generatedNote: "Factual summary.",
  };
}

describe("UI Repair Pass 7C", () => {
  afterEach(() => cleanup());

  it("brief KPI grid uses three equal columns", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../pages/performance/person-brief-drawer.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.performance-metrics\.performance-metrics--brief[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
    );
  });

  it("PersonWorkRow inline Jira key uses EntityLink with href", () => {
    render(
      <PersonWorkRow
        item={workItem}
        variant="inline"
        jiraBaseUrl="https://jira.example.com"
      />,
    );
    const link = screen.getByRole("link", { name: "UX-1490" });
    expect(link.className).toContain("entity-link");
    expect(link.getAttribute("href")).toContain("UX-1490");
    expect(screen.queryByRole("button", { name: "UX-1490" })).toBeNull();
  });

  it("PersonBriefDrawer attention uses shared table with text reason and expandable keys", async () => {
    const user = userEvent.setup();
    mockBrief.mockReturnValue(briefStub());
    mockPerformance.mockReturnValue({
      data: {},
      viewModels: {
        getPerson: () => null,
      },
    } as ReturnType<typeof usePerformanceData>);
    mockCurrentUser.mockReturnValue({
      currentUser: {
        person: { id: "lead-1", role: "lead" },
        team: { directReportIds: ["person-01"] },
      },
    } as ReturnType<typeof useCurrentUser>);

    render(
      <TooltipProvider>
        <PersonBriefDrawer personId="person-01" open onClose={vi.fn()} />
      </TooltipProvider>,
    );

    const drawer = screen.getByTestId("person-brief-drawer");
    const table = within(drawer).getByTestId("attention-signals-table");
    expect(within(table).getByText("No activity for 7+ days")).toBeTruthy();
    expect(
      within(table).queryByText("No activity for 7+ days", { selector: ".badge" }),
    ).toBeNull();
    await user.click(within(table).getByRole("button", { name: /View 1 more/i }));
    expect(within(table).getAllByRole("link").length).toBe(3);
  });

  it("PersonBriefDrawer current work key is a navigable link", async () => {
    mockBrief.mockReturnValue(briefStub());
    mockPerformance.mockReturnValue({
      data: {},
      viewModels: {
        getPerson: () => null,
      },
    } as ReturnType<typeof usePerformanceData>);
    mockCurrentUser.mockReturnValue({
      currentUser: {
        person: { id: "lead-1", role: "lead" },
        team: { directReportIds: ["person-01"] },
      },
    } as ReturnType<typeof useCurrentUser>);

    render(
      <TooltipProvider>
        <PersonBriefDrawer personId="person-01" open onClose={vi.fn()} />
      </TooltipProvider>,
    );

    const drawer = screen.getByTestId("person-brief-drawer");
    await screen.findByRole("link", { name: "UX-1490" });
    const link = within(drawer).getByRole("link", { name: "UX-1490" });
    expect(link.getAttribute("href")).toContain("UX-1490");
  });
});

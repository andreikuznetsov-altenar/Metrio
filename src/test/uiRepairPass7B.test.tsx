// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamPerformanceSnapshot, TeamSecondarySnapshot } from "../domain/performance";
import { TooltipProvider } from "../components/Tooltip/Tooltip";
import { TeamOverviewView } from "../pages/performance/TeamOverviewView";
import { TeamRadarView } from "../pages/performance/TeamRadarView";
import { TeamPeopleView } from "../pages/performance/TeamPeopleView";

vi.mock("../app/feedbackSurveyStore", () => ({
  useFeedbackSurveyStore: (selector: (state: { data: null }) => unknown) =>
    selector({ data: null }),
}));

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: { person: { role: "lead" } },
  }),
}));

import { DEFAULT_OPERATIONAL_RULES } from "../domain/operationalRules/operationalRulesDefaults";

vi.mock("../app/OperationalRulesContext", () => ({
  useOperationalRules: () => ({ rules: DEFAULT_OPERATIONAL_RULES }),
}));

vi.mock("../platform/preferences", () => ({
  loadPreferences: vi.fn().mockResolvedValue({
    jira: { baseUrl: "https://jira.example.com" },
  }),
}));

vi.mock("../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    data: { teamSnapshot: { persons: [] } },
  }),
}));

vi.mock("../app/TaskJourneyContext", () => ({
  useOpenTaskJourneyFromKey: () => () => undefined,
}));

const secondary: TeamSecondarySnapshot = {
  people: [
    {
      personId: "p1",
      personName: "Alex",
      role: "Engineer",
      efficiency: "90%",
      workload: "Heavy",
      availability: "Available",
      attentionState: "",
      attentionVariant: "warning",
      attentionSeverityLabel: "Medium",
      attentionIssueKey: "UX-1490",
      attentionIssueKeys: ["UX-1490"],
      attentionReason: "No activity for 7+ days",
    },
  ],
  radar: [
    {
      personId: "p1",
      personName: "Alex",
      severity: "Medium",
      severityVariant: "warning",
      reason: "UX-1490 — No activity for 7+ days",
      reasonDetail: "No activity for 7+ days",
      primaryIssueKey: "UX-1490",
      relatedIssueKeys: ["UX-1490"],
      primaryAction: "review_workload",
      tasksAffected: 3,
      action: "Review workload",
    },
    {
      personId: "p2",
      personName: "Beth",
      severity: "Low",
      severityVariant: "neutral",
      reason: "Monitoring",
      reasonDetail: "Monitoring",
      primaryAction: "view_person",
      tasksAffected: 1,
      action: "View person",
    },
  ],
  deliveryRisk: [],
};

const snapshotWithAttention: TeamPerformanceSnapshot = {
  directReportIds: ["p1"],
  summary: [
    { label: "Efficiency", value: "86%" },
    { label: "First pass", value: "93%" },
    { label: "Completed", value: "5" },
    { label: "Backflows", value: "2" },
  ],
  attention: [
    {
      personId: "p1",
      personName: "Alex",
      personRole: "Legacy title",
      reason: "No activity",
      severity: "warning",
      issueKeys: ["UX-1", "UX-2", "UX-3"],
      issueCount: 3,
      workload: "Heavy",
    },
  ],
  attentionTotalCount: 1,
  trends: [],
  workload: [
    {
      personId: "p1",
      personName: "Alex",
      activeWork: 12,
      atRisk: 2,
      workload: "Heavy",
      availability: "Available",
    },
  ],
  timeOff: [],
  personDetails: {},
};

function renderOverview(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("UI Repair Pass 7B", () => {
  afterEach(() => cleanup());

  it("Team attention renders compact preview and opens task modal", async () => {
    const user = userEvent.setup();
    renderOverview(
      <TeamOverviewView
        snapshot={snapshotWithAttention}
        secondary={secondary}
        onOpenPerson={() => {}}
      />,
    );
    const row = screen.getByTestId("team-attention-row");
    await user.click(within(row).getByRole("button", { name: /3 tasks/i }));
    expect(screen.getByTestId("task-list-modal")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Title" })).toBeTruthy();
    expect(within(row).getByText("Engineer")).toBeTruthy();
  });

  it("Team workload renders avatar and role from secondary.people", async () => {
    const user = userEvent.setup();
    const onOpenPerson = vi.fn();
    renderOverview(
      <TeamOverviewView
        snapshot={snapshotWithAttention}
        secondary={secondary}
        onOpenPerson={onOpenPerson}
      />,
    );
    const row = screen.getByTestId("team-workload-row");
    expect(within(row).getByText("Engineer")).toBeTruthy();
    await user.click(within(row).getByRole("button", { name: /Alex/i }));
    expect(onOpenPerson).toHaveBeenCalledWith("p1");
  });

  it("Radar action column uses buttons with correct tabs", async () => {
    const user = userEvent.setup();
    const onOpenPerson = vi.fn();
    render(<TeamRadarView rows={secondary.radar} onOpenPerson={onOpenPerson} />);
    await user.click(screen.getByRole("button", { name: "Review workload" }));
    expect(onOpenPerson).toHaveBeenCalledWith("p1", "work");
    await user.click(screen.getByRole("button", { name: "View person" }));
    expect(onOpenPerson).toHaveBeenCalledWith("p2", "overview");
    expect(screen.getByRole("link", { name: "UX-1490" })).toBeTruthy();
  });

  it("People attention issue key is a navigable link", async () => {
    render(<TeamPeopleView rows={secondary.people} onOpenPerson={() => {}} />);
    const link = await screen.findByRole("link", { name: "UX-1490" });
    expect(link.getAttribute("href")).toContain("UX-1490");
  });

  it("Badge contract includes nowrap", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../components/Badge/Badge.css"),
      "utf8",
    );
    expect(css).toMatch(/\.badge[\s\S]*white-space:\s*nowrap/);
  });
});

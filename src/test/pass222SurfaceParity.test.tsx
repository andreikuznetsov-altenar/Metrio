// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { WorkGraphState } from "../app/WorkGraphContext";
import { discoverRelevantProjects } from "../domain/workGraph/projectDiscovery";
import type { AuditIssue } from "../domain/jira/types";
import { MetaList, MetaRow } from "../components/MetaList/MetaList";
import { InfoBlock } from "../components/InfoBlock/InfoBlock";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const graph: WorkGraphState = {
  status: "ready",
  projects: [
    {
      id: "DEMO",
      key: "DEMO",
      name: "Demo",
      jiraUrl: "https://example.atlassian.net/browse/DEMO",
      relevance: "assigned",
      activeTaskCount: 3,
      activeIssues: [
        { issueKey: "DEMO-101", title: "Profile card spacing polish", status: "In Progress" },
        { issueKey: "DEMO-102", title: "Goal detail mobile audit", status: "In Review" },
        { issueKey: "DEMO-103", title: "Feedback empty state", status: "On Hold" },
      ],
    },
  ],
  knowledgeByIssue: new Map(),
  knowledgeByProject: new Map(),
};

vi.mock("../app/WorkGraphContext", () => ({ useWorkGraph: () => graph }));
vi.mock("../platform/preferences", () => ({ loadPreferences: async () => ({}) }));

describe("PASS 22.2 surface parity", () => {
  // Warm the heavy page module once with an explicit hook budget (cold import can exceed 5s
  // when many suites start together); the table test itself stays under the default timeout.
  beforeAll(async () => {
    await import("../pages/performance/ProjectContextSection");
  }, 60_000);

  it("renders the DEMO project active tasks as a canonical table with Jira issue links", async () => {
    const { ProjectContextSection } = await import("../pages/performance/ProjectContextSection");
    render(<ProjectContextSection />);

    const table = screen.getByTestId("project-context-tasks");
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header + 3 active tasks
    const links = within(table).getAllByTestId("jira-issue-link");
    expect(links.map((link) => link.textContent)).toEqual(["DEMO-101", "DEMO-102", "DEMO-103"]);
    for (const link of links) {
      expect(link.getAttribute("href")).toContain(`/browse/${link.textContent}`);
    }
    expect(within(table).getByText("In Review")).toHaveClass("badge");
    expect(screen.getByRole("button", { name: "Project cockpit" })).toHaveClass("btn--secondary");
    expect(screen.getByRole("button", { name: "Open Jira" })).toHaveClass("btn--secondary");
    expect(screen.getByRole("button", { name: "Open Confluence" })).toHaveClass("btn--secondary");
  });

  it("keeps the reported active task count and the listed issues in sync", () => {
    const issue = (key: string): AuditIssue =>
      ({ issueKey: key, issueSummary: `Task ${key}`, currentStatus: "In Progress" }) as AuditIssue;
    const [project] = discoverRelevantProjects({
      activeIssues: [issue("DEMO-1"), issue("DEMO-2"), issue("DEMO-3"), issue("DEMO-4")],
      recentCompletedIssues: [],
      accessibleProjects: [],
      jiraBaseUrl: "https://example.atlassian.net",
    });
    expect(project.activeTaskCount).toBe(4);
    expect(project.activeIssues?.map((i) => i.issueKey)).toEqual([
      "DEMO-1",
      "DEMO-2",
      "DEMO-3",
      "DEMO-4",
    ]);
  });

  it("MetaList renders stacked key/value rows with semantic dl/dt/dd", () => {
    render(
      <MetaList testId="meta">
        <MetaRow label="Status">Active</MetaRow>
        <MetaRow label="Sent">2</MetaRow>
      </MetaList>,
    );
    const list = screen.getByTestId("meta");
    expect(list.tagName).toBe("DL");
    expect(list.querySelectorAll(".meta-list__row")).toHaveLength(2);
    expect(list.querySelector("dt")).toHaveTextContent("Status");
    expect(list.querySelector("dd")).toHaveTextContent("Active");
  });

  it("InfoBlock uses the shared info banner tokens (no ad-hoc colours)", () => {
    render(<InfoBlock testId="info">Important</InfoBlock>);
    expect(screen.getByTestId("info")).toHaveClass("info-block");
    const css = source("src/components/InfoBlock/InfoBlock.css");
    expect(css).toContain("var(--color-banner-info-bg)");
    expect(css).toContain("var(--color-banner-info-border)");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    const tokens = source("src/styles/tokens.css");
    expect((tokens.match(/--color-banner-info-bg/g) ?? []).length).toBeGreaterThanOrEqual(2); // light + dark
  });

  it("Feedback Latest run is stacked key/value rows with a status Badge", () => {
    const view = source("src/pages/feedback/FeedbackCycleDetailView.tsx");
    const css = source("src/pages/feedback/feedback-ds.css");
    expect(view).toContain("<MetaList");
    expect(view).toMatch(/<MetaRow label="Status">[\s\S]{0,120}<Badge/);
    expect(view).not.toContain("feedback-latest-run__grid");
    expect(css).not.toContain("feedback-latest-run__grid");
  });

  it("SegmentedControl hugs its options unless it is explicitly full width", () => {
    const css = source("src/components/SegmentedControl/SegmentedControl.css");
    expect(css).toMatch(
      /\.segmented-control:not\(\.segmented-control--full-width\)\s*\{[^}]*width:\s*fit-content/,
    );
  });

  it("Goal drawer: title in the header, MetaList summary, InfoBlock description, no body h2", () => {
    const drawer = source("src/pages/performance/BambooGoalDetailDrawer.tsx");
    expect(drawer).toMatch(/header=\{detail \? <h2 className="goal-drawer__title">/);
    expect(drawer).toContain("<MetaList");
    expect(drawer).toContain("<InfoBlock");
    expect(drawer).toContain("<PersonIdentity");
    expect(drawer).not.toMatch(/<div className="bamboo-goal-detail"[^>]*>\s*<h2>/);
  });

  it("Task Journey and goal/feedback surfaces share the MetaList primitive", () => {
    expect(source("src/components/TaskJourney/TaskJourneyDrawer.tsx")).toContain("<MetaList");
    expect(source("src/components/TaskJourney/TaskJourneyDrawer.css")).not.toContain("diag-row");
  });

  it("the Due date popover uses the shared popover layer token, not an arbitrary z-index", () => {
    const css = source("src/components/DatePicker/MetrioDatePicker.css");
    expect(css).toMatch(/\.metrio-date-picker__popover\s*\{[^}]*z-index:\s*var\(--z-popover/);
    expect(css).not.toMatch(/z-index:\s*\d{4,}/);
  });
});

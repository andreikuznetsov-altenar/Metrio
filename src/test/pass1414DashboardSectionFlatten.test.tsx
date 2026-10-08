// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { aggregateStaleReviewActions } from "../domain/actions/dedupeActions";
import { buildDashboardQueueRows } from "../domain/actions/buildDashboardQueueRows";
import { DashboardActionQueueTable } from "../components/Table/DashboardActionQueueTable";
import { DashboardRecommendations } from "../pages/home/dashboard/DashboardRecommendations";
import { DashboardQueuePanel } from "../pages/home/dashboard/DashboardQueuePanel";
import { ActionQueueSection } from "../pages/performance/ActionQueueSection";
import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";
import type { ActionItem } from "../domain/actions/actionTypes";

function sourceOf(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

afterEach(() => {
  cleanup();
});

describe("PASS 14.14 dashboard section flattening", () => {
  it("Team Actions / Recommendations remove outer card chrome", () => {
    const queuePanel = sourceOf("src/pages/home/dashboard/DashboardQueuePanel.tsx");
    const recommendations = sourceOf(
      "src/pages/home/dashboard/DashboardRecommendations.tsx",
    );
    const actionQueue = sourceOf("src/pages/performance/ActionQueueSection.tsx");

    expect(queuePanel).toContain('className="dashboard-section action-queue--dashboard"');
    expect(queuePanel).not.toMatch(/executive-panel executive-panel--flush/);
    expect(recommendations).toContain("dashboard-section");
    expect(recommendations).not.toMatch(/executive-dashboard__span-12 executive-panel/);
    expect(actionQueue).toContain("performance-section action-queue action-queue--dashboard");
    expect(actionQueue).not.toMatch(/home-card action-queue action-queue--dashboard/);
  });

  it("Recommendations keeps title and inner cards without outer panel or numeric count", () => {
    const item: ProductRecommendation = {
      id: "backflow-review",
      severity: "watch",
      title: "Review recurring backflow",
      explanation: "Review why work returned from review/QA.",
      actionLabel: "Open Performance",
      actionKind: "open_performance",
      priority: 7,
    };
    const { container } = render(
      <DashboardRecommendations items={[item]} onAction={vi.fn()} />,
    );
    const section = screen.getByTestId("dashboard-recommendations");
    expect(section.className).toContain("dashboard-section");
    expect(section.className).not.toContain("executive-panel");
    expect(within(section).getByRole("heading", { name: "Recommendations" })).toBeTruthy();
    expect(container.querySelector(".executive-recommendations__count")).toBeNull();
    expect(container.querySelector(".executive-recommendations__item")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Performance" })).toBeTruthy();
  });

  it("ActionQueueSection dashboard variant exposes flat section title", () => {
    render(
      <ActionQueueSection
        variant="dashboard"
        title="Team Actions"
        items={[]}
        emptyMessage="Empty"
        onOpen={vi.fn()}
      />,
    );
    const section = screen.getByTestId("team-actions-section");
    expect(section.className).toContain("performance-section");
    expect(section.className).not.toContain("home-card");
    expect(within(section).getByRole("heading", { name: "Team Actions" })).toBeTruthy();
  });
});

describe("PASS 14.14 Team Actions task-count drilldown", () => {
  it("opens TaskListModal with exactly N rows for aggregate count link", async () => {
    const user = userEvent.setup();
    const aggregate = aggregateStaleReviewActions(
      Array.from({ length: 5 }, (_, i) => ({
        issueKey: `UX-${200 + i}`,
        daysInReview: 10,
      })),
    );
    expect(aggregate).not.toBeNull();
    const rows = buildDashboardQueueRows([aggregate!]);
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={vi.fn()}
        openLabel={() => "Open"}
        sortColumnId={null}
        sortDirection={null}
        onToggleSort={() => undefined}
        jiraBaseUrl="https://jira.example.com"
      />,
    );

    const link = screen.getByTestId("grouped-issue-count-link");
    expect(link).toHaveTextContent("5 tasks");
    await user.click(link);

    const modal = await screen.findByTestId("task-list-modal");
    const issueRows = within(modal).getAllByRole("row").filter((row) =>
      row.querySelector(".performance-table__issue-key-link"),
    );
    expect(issueRows).toHaveLength(5);
  });

  it("does not render an interactive count for zero-key collections", () => {
    const item: ActionItem = {
      id: "workload-1",
      kind: "workload",
      severity: "warning",
      title: "Alex has 4 active tasks",
      personId: "alex",
      personName: "Alex",
      count: 4,
      target: { kind: "person", personId: "alex", tab: "work" },
      source: "jira",
    };
    const rows = buildDashboardQueueRows([item]);
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={vi.fn()}
        openLabel={() => "Open"}
        sortColumnId={null}
        sortDirection={null}
        onToggleSort={() => undefined}
      />,
    );
    expect(screen.queryByTestId("grouped-issue-count-link")).toBeNull();
    expect(screen.getByText("4 active tasks")).toBeTruthy();
  });

  it("DashboardQueuePanel uses flat section wrapper", () => {
    const { container } = render(
      <DashboardQueuePanel
        title="Team Actions"
        workColumnLabel="Work"
        items={[]}
        emptyMessage="None"
        onOpen={vi.fn()}
        openLabel={() => "Open"}
        testId="dashboard-tab-team"
      />,
    );
    const section = screen.getByTestId("dashboard-tab-team");
    expect(section.className).toContain("dashboard-section");
    expect(section.className).not.toContain("executive-panel");
    expect(container.querySelector(".executive-panel")).toBeNull();
  });

  it("supports keyboard activation of the task-count link", async () => {
    const user = userEvent.setup();
    const aggregate = aggregateStaleReviewActions([
      { issueKey: "UX-1", daysInReview: 10 },
      { issueKey: "UX-2", daysInReview: 11 },
      { issueKey: "UX-3", daysInReview: 12 },
    ]);
    const rows = buildDashboardQueueRows([aggregate!]);
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={vi.fn()}
        openLabel={() => "Open"}
        sortColumnId={null}
        sortDirection={null}
        onToggleSort={() => undefined}
        jiraBaseUrl="https://jira.example.com"
      />,
    );
    const link = screen.getByTestId("grouped-issue-count-link");
    link.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByTestId("task-list-modal")).toBeTruthy();
  });
});

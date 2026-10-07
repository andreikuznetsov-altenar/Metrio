// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { aggregateStaleReviewActions } from "../../domain/actions/dedupeActions";
import { buildDashboardQueueRows } from "../../domain/actions/buildDashboardQueueRows";
import type { ActionItem } from "../../domain/actions/actionTypes";
import { DashboardActionQueueTable } from "../../components/Table/DashboardActionQueueTable";

describe("DashboardActionQueueTable rows", () => {
  it("uses table cells for tag and action columns", () => {
    const aggregate = aggregateStaleReviewActions([
      { issueKey: "UX-1", daysInReview: 10 },
      { issueKey: "UX-2", daysInReview: 11 },
    ]);
    expect(aggregate).not.toBeNull();
    const person: ActionItem = {
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
    const rows = buildDashboardQueueRows([aggregate!, person]);
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
    const tagCells = screen.getAllByTestId("dashboard-action-tag-cell");
    const actionCells = screen.getAllByTestId("dashboard-action-cta-cell");
    expect(tagCells.length).toBe(2);
    expect(actionCells.length).toBe(2);
    const rowTiers = screen
      .getAllByTestId("dashboard-action-row")
      .map((row) => row.getAttribute("data-row-tier"));
    expect(rowTiers).toEqual(["grouped", "person"]);
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardQueueRow } from "../../domain/actions/buildDashboardQueueRows";
import type { ActionItem } from "../../domain/actions/actionTypes";
import { DashboardActionQueueTable } from "./DashboardActionQueueTable";

const baseItem: ActionItem = {
  id: "a1",
  severity: "warning",
  title: "Task",
  kind: "workload",
  target: { kind: "person", personId: "person-01", tab: "work" },
  source: "jira",
};

const rows: DashboardQueueRow[] = [
  {
    id: "group-ux",
    subject: "UX-5726",
    reasonTags: ["Stalled"],
    contextLines: ["2 people"],
    item: {
      ...baseItem,
      id: "g1",
      kind: "review_bottleneck",
      title: "UX-5726",
      count: 3,
      target: { kind: "performance", tab: "overview" },
    },
  },
  {
    id: "person-1",
    subject: "Alex Example",
    reasonTags: ["Review"],
    contextLines: ["Due tomorrow"],
    item: {
      ...baseItem,
      id: "p1",
      personId: "person-01",
      personName: "Alex Example",
    },
  },
];

function stubColumnRects(table: HTMLTableElement) {
  const widths = [280, 160, 240, 120];
  const paint = (cells: NodeListOf<Element>) => {
    let left = 12;
    cells.forEach((cell, index) => {
      const width = widths[index] ?? 100;
      const rect = {
        x: left,
        y: 0,
        left,
        top: 0,
        right: left + width,
        bottom: 32,
        width,
        height: 32,
        toJSON: () => ({}),
      } as DOMRect;
      vi.spyOn(cell, "getBoundingClientRect").mockReturnValue(rect);
      left += width;
    });
  };
  paint(table.querySelectorAll("thead th"));
  table.querySelectorAll("tbody tr").forEach((row) => {
    paint(row.querySelectorAll("td"));
  });
}

describe("DashboardActionQueueTable geometry", () => {
  afterEach(() => cleanup());

  it("uses shared performance-table colgroup for Work Reason Context Action", () => {
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={() => undefined}
        openLabel={() => "Open"}
        sortColumnId={null}
        sortDirection={null}
        onToggleSort={() => undefined}
      />,
    );
    const table = screen.getByTestId("dashboard-action-queue");
    expect(table.querySelector("colgroup col.col-action")).toBeTruthy();
    expect(table.querySelectorAll("colgroup col")).toHaveLength(4);
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent?.replace(/↕|↑|↓/g, "").trim())).toEqual([
      "Work",
      "Reason",
      "Context",
      "Action",
    ]);
  });

  it("aligns each header left edge with body cells on the same column index", () => {
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={() => undefined}
        openLabel={() => "View"}
        sortColumnId={null}
        sortDirection={null}
        onToggleSort={() => undefined}
      />,
    );
    const table = screen.getByTestId("dashboard-action-queue");
    stubColumnRects(table);
    const headers = within(table).getAllByRole("columnheader");
    const groupedRow = within(table).getAllByRole("row")[1];
    const personRow = within(table).getAllByRole("row")[2];
    for (let col = 0; col < 4; col += 1) {
      const headerLeft = headers[col]!.getBoundingClientRect().left;
      expect(groupedRow.querySelectorAll("td")[col]!.getBoundingClientRect().left).toBe(
        headerLeft,
      );
      expect(personRow.querySelectorAll("td")[col]!.getBoundingClientRect().left).toBe(
        headerLeft,
      );
    }
    const actionCell = personRow.querySelectorAll("td")[3]!;
    expect(actionCell.getBoundingClientRect().left).toBe(headers[3]!.getBoundingClientRect().left);
  });

  it("renders grouped task before person rows with shared work lead gutter", () => {
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={() => undefined}
        openLabel={() => "Open"}
        sortColumnId={null}
        sortDirection={null}
        onToggleSort={() => undefined}
      />,
    );
    const tableRows = screen.getAllByTestId("dashboard-action-row");
    expect(tableRows[0]).toHaveAttribute("data-row-tier", "grouped");
    expect(tableRows[1]).toHaveAttribute("data-row-tier", "person");
    expect(screen.getByText("UX-5726")).toBeTruthy();
    expect(tableRows[0].querySelector(".performance-table__work-lead-slot")).toBeTruthy();
    expect(tableRows[1].querySelector(".person-avatar")).toBeTruthy();
  });

  it("keeps sort icon within 8px of its header label", () => {
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={() => undefined}
        openLabel={() => "Open"}
        sortColumnId="reason"
        sortDirection="asc"
        onToggleSort={() => undefined}
      />,
    );
    const table = screen.getByTestId("dashboard-action-queue");
    const reasonHeader = within(table).getAllByRole("columnheader")[1]!;
    const label = reasonHeader.querySelector(".performance-table__sort-label")!;
    const icon = reasonHeader.querySelector(".performance-table__sort-icon")!;
    const labelRect = {
      right: 100,
      left: 40,
      top: 0,
      bottom: 20,
      width: 60,
      height: 20,
      x: 40,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    const iconRect = {
      left: 108,
      right: 120,
      top: 0,
      bottom: 20,
      width: 12,
      height: 20,
      x: 108,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    vi.spyOn(label, "getBoundingClientRect").mockReturnValue(labelRect);
    vi.spyOn(icon, "getBoundingClientRect").mockReturnValue(iconRect);
    expect(iconRect.left - labelRect.right).toBe(8);
  });

  it("renders grouped issue keys as Jira links when base URL is configured", async () => {
    render(
      <DashboardActionQueueTable
        workColumnLabel="Work"
        rows={rows}
        onOpen={() => undefined}
        openLabel={() => "Open"}
        sortColumnId={null}
        sortDirection={null}
        onToggleSort={() => undefined}
        jiraBaseUrl="https://jira.example.com"
      />,
    );
    const link = await waitFor(() => screen.getByRole("link", { name: "UX-5726" }));
    expect(link.getAttribute("href")).toContain("/browse/UX-5726");
    expect(link).toHaveClass("entity-link");
  });
});

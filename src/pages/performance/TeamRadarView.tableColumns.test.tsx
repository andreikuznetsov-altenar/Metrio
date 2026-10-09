// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPreferences } from "../../platform/preferences";
import type { TeamRadarRow } from "../../domain/performance";
import { TeamRadarView } from "./TeamRadarView";

vi.mock("../../platform/preferences", () => ({
  loadPreferences: vi.fn().mockResolvedValue({
    jira: { baseUrl: "https://jira.example.com" },
  }),
}));

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    data: { teamSnapshot: { persons: [] } },
  }),
}));

vi.mock("../../app/TaskJourneyContext", () => ({
  useOpenTaskJourneyFromKey: () => () => undefined,
}));

const rows: TeamRadarRow[] = [
  {
    personId: "p1",
    personName: "Alex",
    severity: "High",
    severityVariant: "warning",
    reason: "UX-1 — Stalled",
    reasonDetail: "Stalled",
    primaryIssueKey: "UX-1",
    relatedIssueKeys: ["UX-1"],
    primaryAction: "review_workload",
    tasksAffected: 2,
    action: "Review workload",
  },
  {
    personId: "p2",
    personName: "Beth",
    severity: "Watch",
    severityVariant: "neutral",
    reason: "Monitoring",
    reasonDetail: "Monitoring",
    primaryAction: "view_person",
    tasksAffected: 1,
    action: "View person",
  },
];

function stubTableColumnLayout(table: HTMLTableElement) {
  const widths = [192, 384, 96, 144, 120];
  const assignRow = (cells: NodeListOf<Element>) => {
    let left = 16;
    cells.forEach((cell, index) => {
      const width = widths[index] ?? 100;
      const rect = {
        x: left,
        y: 0,
        left,
        top: 0,
        right: left + width,
        bottom: 40,
        width,
        height: 40,
        toJSON: () => ({}),
      } as DOMRect;
      vi.spyOn(cell, "getBoundingClientRect").mockReturnValue(rect);
      left += width;
    });
  };

  assignRow(table.querySelectorAll("thead th"));
  table.querySelectorAll("tbody tr").forEach((row) => {
    assignRow(row.querySelectorAll("td"));
  });
}

beforeEach(() => {
  vi.mocked(loadPreferences).mockResolvedValue({
    jira: { baseUrl: "https://jira.example.com" },
  } as Awaited<ReturnType<typeof loadPreferences>>);
});

afterEach(() => {
  cleanup();
});

describe("TeamRadarView table columns", () => {
  it("orders columns Person, Reason, Tasks, Severity, Action", () => {
    render(<TeamRadarView rows={rows} onOpenPerson={() => {}} />);
    const table = within(screen.getByTestId("team-radar-view")).getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent?.replace(/↕|↑|↓/g, "").trim())).toEqual([
      "Person",
      "Reason",
      "Tasks",
      "Severity",
      "Action",
    ]);
  });

  it("aligns Severity and Action headers with their body cells on the same column index", () => {
    render(<TeamRadarView rows={rows} onOpenPerson={() => {}} />);
    const table = within(screen.getByTestId("team-radar-view")).getByRole("table");
    const severityIndex = 3;
    const actionIndex = 4;
    const headers = within(table).getAllByRole("columnheader");
    expect(headers[severityIndex]).toHaveTextContent("Severity");
    expect(headers[actionIndex]).toHaveTextContent("Action");

    const firstRow = within(table).getAllByRole("row")[1];
    const cells = within(firstRow).getAllByRole("cell");
    expect(within(cells[severityIndex]).getByText("High")).toBeTruthy();
    expect(
      within(cells[actionIndex]).getByRole("button", { name: "Review workload" }),
    ).toBeTruthy();
  });

  it("keeps Severity and Action bounding boxes disjoint with action inset preserved", () => {
    render(<TeamRadarView rows={rows} onOpenPerson={() => {}} />);
    const table = within(screen.getByTestId("team-radar-view")).getByRole("table");
    stubTableColumnLayout(table);

    const headers = within(table).getAllByRole("columnheader");
    const severityHeader = headers[3];
    const actionHeader = headers[4];
    expect(severityHeader.getBoundingClientRect().left).toBe(
      within(table).getAllByRole("row")[1].querySelectorAll("td")[3]!.getBoundingClientRect().left,
    );
    expect(actionHeader.getBoundingClientRect().left).toBe(
      within(table)
        .getByRole("button", { name: "Review workload" })
        .closest("td")!
        .getBoundingClientRect().left,
    );
    expect(severityHeader.getBoundingClientRect().right).toBeLessThanOrEqual(
      actionHeader.getBoundingClientRect().left,
    );

    const viewPersonRow = within(table).getAllByRole("row")[2];
    const severityCell = viewPersonRow.querySelectorAll("td")[3]!;
    const actionCell = viewPersonRow.querySelectorAll("td")[4]!;
    expect(within(severityCell).getByText("Watch")).toBeTruthy();
    expect(within(actionCell).getByRole("button", { name: "View person" })).toBeTruthy();
    expect(severityCell.getBoundingClientRect().right).toBeLessThanOrEqual(
      actionCell.getBoundingClientRect().left,
    );
    expect(actionCell.getBoundingClientRect().right).toBeLessThanOrEqual(16 + 192 + 384 + 96 + 144 + 120);
  });
});

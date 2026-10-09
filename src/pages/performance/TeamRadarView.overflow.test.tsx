// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamRadarRow } from "../../domain/performance";
import { TeamRadarView } from "./TeamRadarView";
import "./performance-dashboard.css";

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
    personName: "Alex With A Very Long Display Name",
    severity: "High",
    severityVariant: "warning",
    reason: "UX-5726 — Stalled",
    reasonDetail:
      "Work has been idle in review longer than expected with additional context that should wrap inside the cell",
    primaryIssueKey: "UX-5726",
    relatedIssueKeys: ["UX-5726"],
    primaryAction: "review_workload",
    tasksAffected: 12,
    action: "Review workload",
  },
];

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TeamRadarView overflow", () => {
  it("does not force horizontal overflow at supported desktop width", () => {
    const { container } = render(<TeamRadarView rows={rows} onOpenPerson={() => {}} />);
    const table = container.querySelector(".performance-table--radar") as HTMLTableElement;
    expect(table).toBeTruthy();
    expect(
      getComputedStyle(table).minWidth === "0px" || getComputedStyle(table).minWidth === "0",
    ).toBe(true);
    const wrap = container.querySelector(".performance-table-wrap--radar") as HTMLElement;
    expect(getComputedStyle(wrap).overflowX).toBe("visible");
    Object.defineProperty(table, "clientWidth", { value: 960, configurable: true });
    Object.defineProperty(table, "scrollWidth", { value: 958, configurable: true });
    expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth + 1);
  });
});

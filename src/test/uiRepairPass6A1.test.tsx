import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartTooltip } from "../pages/performance/TrendMiniChart";
import { TrendMiniChart } from "../pages/performance/TrendMiniChart";
import type { TrendCardData } from "../domain/performance";
import { AttentionSignalsTable } from "../pages/performance/AttentionSignalsTable";
import type { GroupedAttentionSignal } from "../pages/performance/groupAttentionSignals";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-mock">{children}</div>
  ),
  AreaChart: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: (state: { activeTooltipIndex?: number }) => void;
  }) => (
    <div
      data-testid="area-chart"
      onClick={() => onClick?.({ activeTooltipIndex: 1 })}
    >
      {children}
    </div>
  ),
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({
    content,
  }: {
    content?: (props: { active?: boolean; payload?: unknown[] }) => React.ReactNode;
  }) => (
    <div data-testid="recharts-tooltip">
      {content?.({ active: true, payload: [{ payload: { date: "2026-09-02", value: 3 } }] })}
    </div>
  ),
}));

const trend: TrendCardData = {
  label: "Completed",
  value: "12",
  trendMetricKind: "count",
  chartSeries: [
    { date: "2026-09-01", value: 1 },
    { date: "2026-09-02", value: 3 },
  ],
};

describe("UI repair pass 6A.1 — trend tooltip and interaction", () => {
  afterEach(() => cleanup());

  it("ChartTooltip omits click hint when not interactive", () => {
    render(
      <ChartTooltip
        active
        payload={[{ payload: { date: "2026-09-01", value: 1 } }]}
        trend={trend}
        interactive={false}
      />,
    );
    expect(screen.getByText(/Completed:/)).toBeTruthy();
    expect(screen.queryByText("Click to view work")).toBeNull();
  });

  it("ChartTooltip shows click hint when interactive", () => {
    render(
      <ChartTooltip
        active
        payload={[{ payload: { date: "2026-09-01", value: 1 } }]}
        trend={trend}
        interactive
      />,
    );
    expect(screen.getByText("Click to view work")).toBeTruthy();
  });

  it("fires onPointClick with date and value from chart click", async () => {
    const onPointClick = vi.fn();
    render(<TrendMiniChart trend={trend} onPointClick={onPointClick} />);
    await userEvent.click(screen.getByTestId("area-chart"));
    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick).toHaveBeenCalledWith(
      { date: "2026-09-02", value: 3 },
      expect.anything(),
    );
  });

  it("arrow keys move selection and Enter opens point", () => {
    const onPointClick = vi.fn();
    render(<TrendMiniChart trend={trend} onPointClick={onPointClick} />);
    const chart = screen.getByTestId("trend-mini-chart");
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    fireEvent.keyDown(chart, { key: "Enter" });
    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick.mock.calls[0][0]).toEqual({ date: "2026-09-01", value: 1 });
  });
});

describe("UI repair pass 6A.1 — attention signals table", () => {
  const groups: GroupedAttentionSignal[] = [
    {
      label: "Long review",
      variant: "warning",
      reason: "Stuck in review",
      taskCount: 2,
      issueKeys: ["UX-1", "UX-2", "UX-3"],
    },
  ];

  it("renders entity links and opens grouped task modal", async () => {
    const user = userEvent.setup();
    render(<AttentionSignalsTable groups={groups} jiraBaseUrl="https://jira.example.com" />);
    expect(screen.getByTestId("attention-signals-table")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /3 tasks/i }));
    expect(screen.getByTestId("task-list-modal")).toBeTruthy();
  });
});

describe("UI repair pass 6A.1 — table row divider contract", () => {
  it("uses row-level divider without td borders or fixed row height", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../styles/ui-interaction-system.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.performance-table tbody tr:not\(:last-child\) td[\s\S]*border-bottom: 1px solid var\(--color-border\)/,
    );
    expect(css).toMatch(/\.performance-table thead th[\s\S]*border-bottom: 1px solid var\(--color-border\)/);
    expect(css).toMatch(/\.performance-table th,\s*\n\.performance-table td[\s\S]*border-bottom: none/);
    expect(css).toMatch(/\.performance-table tbody tr[\s\S]*height: auto/);
    expect(css).not.toContain(".performance-table td {\n  border-bottom:");
    expect(css).toMatch(/\.performance-table__clamp[\s\S]*-webkit-line-clamp:\s*2/);
  });
});

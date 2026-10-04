import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-mock">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));
import { parseDurationDays, sortRows } from "../components/Table/tableSort";
import { TrendMiniChart } from "../pages/performance/TrendMiniChart";
import type { TrendCardData } from "../domain/performance";

const trend: TrendCardData = {
  label: "Completed",
  value: "12",
  trendMetricKind: "number",
  chartSeries: [
    { date: "2026-09-01", value: 1 },
    { date: "2026-09-02", value: 3 },
  ],
};

describe("UI repair pass 6A", () => {
  afterEach(() => cleanup());
  it("hides click hint when trend chart has no drilldown handler", () => {
    render(<TrendMiniChart trend={trend} />);
    expect(screen.queryByText("Click to view work")).toBeNull();
    expect(screen.getByTestId("trend-mini-chart")).not.toHaveClass(
      "trend-mini-chart--clickable",
    );
  });

  it("marks interactive trend charts as clickable", () => {
    render(<TrendMiniChart trend={trend} onPointClick={vi.fn()} />);
    const chart = screen.getByTestId("trend-mini-chart");
    expect(chart).toHaveClass("trend-mini-chart--clickable");
    expect(chart).toHaveAttribute("role", "button");
  });

  it("sorts age duration numerically", () => {
    const rows = [{ age: "112 days" }, { age: "13 days" }, { age: "<1 day" }];
    const sorted = sortRows(
      rows,
      { columnId: "age", direction: "asc" },
      (row) => row.age,
      () => "duration",
    );
    expect(sorted.map((row) => row.age)).toEqual([
      "<1 day",
      "13 days",
      "112 days",
    ]);
  });

  it("parses duration literals for sorting", () => {
    expect(parseDurationDays("112 days")).toBe(112);
    expect(parseDurationDays("<1 day")).toBe(0.5);
  });
});

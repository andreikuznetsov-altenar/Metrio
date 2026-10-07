import { describe, expect, it } from "vitest";
import { createPerformanceDateRange } from "../performance/performanceDateRange";
import { compareTrendPeriods, trendSufficiency } from "./trendEngine";

function dailyPoints(from: string, days: number, value = 1) {
  const start = new Date(`${from}T12:00:00`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, value };
  });
}

describe("historical performance ranges", () => {
  it("marks 6-month trends sufficient when bootstrap covers both comparison windows", () => {
    const range = createPerformanceDateRange("6m");
    const trendDays = 180;
    const anchor = new Date(`${range.to}T12:00:00`);
    const priorStart = new Date(anchor);
    priorStart.setDate(priorStart.getDate() - trendDays * 2 + 1);
    const points = dailyPoints(priorStart.toISOString().slice(0, 10), trendDays * 2);
    const sufficiency = trendSufficiency(points, trendDays, anchor);
    expect(sufficiency.sufficient).toBe(true);
    const comparison = compareTrendPeriods(points, "completed", trendDays, anchor);
    expect(comparison.sufficient).toBe(true);
    expect(comparison.label).not.toBe("—");
  });

  it("does not falsely mark insufficient when only the rolling window is short but range anchor fits", () => {
    const range = createPerformanceDateRange("30d");
    const anchor = new Date(`${range.to}T12:00:00`);
    const points = dailyPoints(range.from, 30);
    const sufficiency = trendSufficiency(points, 30, anchor);
    expect(sufficiency.daysRecorded).toBeGreaterThanOrEqual(7);
  });
});

import { describe, expect, it } from "vitest";
import {
  createPerformanceDateRange,
  comparisonPeriodLabel,
  comparisonPeriodExactLabel,
  formatPerformanceDateDisplay,
  inclusiveRangeDayCount,
} from "./performanceDateRange";

describe("performanceDateRange display", () => {
  it("keeps ISO date-only strings for custom range bounds", () => {
    const range = {
      ...createPerformanceDateRange("30d"),
      from: "2026-05-01",
      to: "2026-10-02",
      preset: "custom" as const,
    };
    expect(range.from).toBe("2026-05-01");
    expect(range.to).toBe("2026-10-02");
    expect(inclusiveRangeDayCount(range.from, range.to)).toBeGreaterThan(0);
  });

  it("formats custom comparison label without ISO noise", () => {
    const range = {
      from: "2026-05-01",
      to: "2026-10-02",
      preset: "custom" as const,
    };
    expect(comparisonPeriodLabel(range)).toMatch(/^vs \d{1,2} \w{3} – \d{1,2} \w{3}$/);
    expect(comparisonPeriodExactLabel(range)).toContain("2026-");
  });

  it("formats toolbar display dates unambiguously", () => {
    expect(formatPerformanceDateDisplay("2026-05-01")).toBe("01 May 2026");
    expect(formatPerformanceDateDisplay("2026-09-02")).toBe("02 Sep 2026");
  });
});

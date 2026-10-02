import { describe, expect, it } from "vitest";
import {
  createPerformanceDateRange,
  comparisonPeriodLabel,
  comparisonPeriodExactLabel,
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
});

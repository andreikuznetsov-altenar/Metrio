import { describe, expect, it } from "vitest";
import { resolvePerformanceReportRanges } from "../../domain/performance/reportParams";

describe("resolvePerformanceReportRanges", () => {
  it("maps org review target to full team scope for managers", () => {
    const ranges = resolvePerformanceReportRanges("30d", "org", "team");
    expect(ranges.teamScope).toBe("full");
    expect(ranges.fetchDateFrom <= ranges.displayDateFrom).toBe(true);
  });

  it("keeps employee audience on direct scope", () => {
    const ranges = resolvePerformanceReportRanges("7d", "quarter", "employee");
    expect(ranges.teamScope).toBe("direct");
  });
});

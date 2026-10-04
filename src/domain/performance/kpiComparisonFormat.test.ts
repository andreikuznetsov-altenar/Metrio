import { describe, expect, it } from "vitest";
import { formatMetricComparisonLine } from "./kpiComparisonFormat";

describe("kpiComparisonFormat", () => {
  it("joins delta and comparison caption", () => {
    expect(formatMetricComparisonLine("-1", "vs previous period")).toBe(
      "-1 vs previous period",
    );
    expect(formatMetricComparisonLine("+2", "vs previous 30 days")).toBe(
      "+2 vs previous 30 days",
    );
    expect(formatMetricComparisonLine("0.0 pp", "vs previous period")).toBe(
      "0.0 pp vs previous period",
    );
  });
});

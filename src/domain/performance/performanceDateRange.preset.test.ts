import { describe, expect, it } from "vitest";
import {
  comparisonPeriodLabel,
  createPerformanceDateRange,
  DATE_RANGE_PRESET_OPTIONS,
  dateRangeKeyFromPerformanceRange,
  isKnownDateRangePreset,
  presetToBounds,
} from "./performanceDateRange";

describe("performanceDateRange presets", () => {
  const now = new Date("2026-10-02T12:00:00.000Z");

  it("maps menu presets to expected bounds", () => {
    expect(presetToBounds("7d", now)).toEqual({
      from: "2026-09-25",
      to: "2026-10-02",
    });
    expect(presetToBounds("30d", now)).toEqual({
      from: "2026-09-02",
      to: "2026-10-02",
    });
    expect(presetToBounds("3m", now)).toEqual({
      from: "2026-07-02",
      to: "2026-10-02",
    });
    expect(presetToBounds("6m", now)).toEqual({
      from: "2026-04-02",
      to: "2026-10-02",
    });
    expect(presetToBounds("1y", now)).toEqual({
      from: "2025-10-02",
      to: "2026-10-02",
    });
  });

  it("uses comparison labels for new presets", () => {
    expect(comparisonPeriodLabel(createPerformanceDateRange("3m", now))).toBe(
      "vs previous 3 months",
    );
    expect(comparisonPeriodLabel(createPerformanceDateRange("1y", now))).toBe(
      "vs previous year",
    );
  });

  it("exposes only Phase 20 menu presets", () => {
    expect(DATE_RANGE_PRESET_OPTIONS.map((o) => o.value)).toEqual([
      "7d",
      "30d",
      "3m",
      "6m",
      "1y",
    ]);
    expect(DATE_RANGE_PRESET_OPTIONS.map((o) => o.label)).not.toContain(
      "Quarter",
    );
    expect(DATE_RANGE_PRESET_OPTIONS.map((o) => o.label)).not.toContain(
      "Custom",
    );
  });

  it("treats legacy quarter session preset as non-menu preset", () => {
    const legacy = {
      from: "2026-07-01",
      to: "2026-10-02",
      preset: "quarter" as const,
    };
    expect(isKnownDateRangePreset(legacy.preset)).toBe(false);
    expect(legacy.from).toBe("2026-07-01");
    expect(dateRangeKeyFromPerformanceRange(legacy)).toBe("3m");
  });
});

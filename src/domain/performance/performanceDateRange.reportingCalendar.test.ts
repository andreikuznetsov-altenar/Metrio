import { afterEach, describe, expect, it } from "vitest";
import { dateRangeKeyToBounds } from "./dateRangeParams";
import { createPerformanceDateRange, presetToBounds } from "./performanceDateRange";
import { calendarPeriodDateKeys } from "../periods/calendarPeriod";
import { getLocalDateKey } from "../periods/dateRange";
import type { DateRangeKey } from "../performance";

/**
 * Analytical date ranges use the canonical reporting calendar (Europe/Malta), never the host-OS
 * date, so the selected range and the trend windows agree in every host time zone.
 */
describe("performance date ranges use the reporting calendar", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  const presets: DateRangeKey[] = ["7d", "30d", "3m", "6m", "1y"];
  const hostZones = ["UTC", "Europe/Malta", "America/New_York"];
  // 21:30Z: 23:30 Malta, the 16th everywhere. 22:30Z: 00:30 Malta (17th) while UTC/New York are
  // still on the 16th. 00:30Z on the 17th: UTC is on the 17th, New York is still on the 16th.
  const instants: { at: string; reportingDate: string }[] = [
    { at: "2026-10-16T21:30:00.000Z", reportingDate: "2026-10-16" },
    { at: "2026-10-16T22:30:00.000Z", reportingDate: "2026-10-17" },
    { at: "2026-10-17T00:30:00.000Z", reportingDate: "2026-10-17" },
  ];

  it("ends every preset on the reporting date regardless of the host time zone", () => {
    for (const { at, reportingDate } of instants) {
      const now = new Date(at);
      expect(getLocalDateKey(now)).toBe(reportingDate);
      for (const preset of presets) {
        const results = hostZones.map((tz) => {
          process.env.TZ = tz;
          return {
            tz,
            bounds: presetToBounds(preset, now),
            range: createPerformanceDateRange(preset, now),
            params: dateRangeKeyToBounds(preset, now),
          };
        });
        for (const r of results) {
          expect(r.bounds.to, `${preset} ${at} under ${r.tz}`).toBe(reportingDate);
          expect(r, `${preset} ${at} under ${r.tz}`).toEqual({ ...results[0], tz: r.tz });
          expect(r.params).toEqual({ dateFrom: r.bounds.from, dateTo: r.bounds.to });
        }
      }
    }
  });

  it("keeps the selected range's last day equal to the trend window's last day", () => {
    for (const { at } of instants) {
      const now = new Date(at);
      for (const tz of hostZones) {
        process.env.TZ = tz;
        const range = presetToBounds("30d", now);
        const window = calendarPeriodDateKeys(30, now);
        expect(range.to, `${at} under ${tz}`).toBe(window[window.length - 1]);
      }
    }
  });

  it("preserves the existing period lengths and month clamping", () => {
    process.env.TZ = "America/New_York";
    const now = new Date("2026-10-02T12:00:00.000Z");
    expect(presetToBounds("7d", now)).toEqual({ from: "2026-09-25", to: "2026-10-02" });
    expect(presetToBounds("30d", now)).toEqual({ from: "2026-09-02", to: "2026-10-02" });
    expect(presetToBounds("3m", now)).toEqual({ from: "2026-07-02", to: "2026-10-02" });
    expect(presetToBounds("1y", now)).toEqual({ from: "2025-10-02", to: "2026-10-02" });
    // End-of-month clamps to the last day of the target month, as before.
    expect(presetToBounds("6m", new Date("2026-08-31T10:00:00.000Z"))).toEqual({
      from: "2026-02-28",
      to: "2026-08-31",
    });
    expect(presetToBounds("3m", new Date("2024-05-31T10:00:00.000Z"))).toEqual({
      from: "2024-02-29",
      to: "2024-05-31",
    });
  });
});

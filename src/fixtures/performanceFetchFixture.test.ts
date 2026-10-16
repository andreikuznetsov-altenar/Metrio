import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { VISUAL_FIXTURE_NOW_ISO, setAppClock, setAppClockFixed } from "../platform/appClock";
import { getLocalDateKey } from "../domain/periods/dateRange";
import { buildVisualPerformanceFetchResult } from "./performanceFetchFixture";
import { buildPerformanceViewModels } from "../services/performance/performanceViewModel";

describe("performanceFetchFixture", () => {
  beforeEach(() => setAppClockFixed(VISUAL_FIXTURE_NOW_ISO));
  afterEach(() => setAppClock(null));

  it("builds view models with KPI context and sparklines", () => {
    const data = buildVisualPerformanceFetchResult("30d", "team", "team");
    const vm = buildPerformanceViewModels(data, "person-sam");
    expect(vm.teamOverview.summary.find((m) => m.label === "Throughput")?.value).toBeTruthy();
    expect(
      vm.teamOverview.trends.filter((t) => (t.sparkline?.length ?? 0) >= 2).length,
    ).toBeGreaterThanOrEqual(2);
    expect(vm.teamOverview.attention.length).toBeGreaterThan(0);
    expect(vm.teamSecondary.deliveryRisk.length).toBeGreaterThan(0);
  });
});

describe("performanceFetchFixture clock determinism", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    setAppClock(null);
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  // Malta midnight is 21:00Z/22:00Z; UTC midnight and New York midnight fall later. Each instant
  // lands on a different side of at least one of those boundaries.
  const instants = [
    "2026-10-16T21:30:00.000Z", // 23:30 Malta, still the 16th everywhere
    "2026-10-16T22:30:00.000Z", // 00:30 Malta (17th), still the 16th in UTC and New York
    "2026-10-17T00:30:00.000Z", // 17th in UTC, still the 16th in New York
  ];

  it("gives the same range, history and sparklines for every instant and host time zone", () => {
    const signature = (instant: string) => {
      setAppClockFixed(instant);
      const data = buildVisualPerformanceFetchResult("30d", "team", "team", new Date(instant));
      const vm = buildPerformanceViewModels(data, "person-sam");
      return {
        to: data.reportData.params.dateTo,
        days:
          Date.parse(`${data.reportData.params.dateTo}T00:00:00Z`) / 86_400_000 -
          Date.parse(`${data.reportData.params.dateFrom}T00:00:00Z`) / 86_400_000,
        sparklineLengths: vm.teamOverview.trends.map((t) => t.sparkline?.length ?? 0),
      };
    };

    for (const instant of instants) {
      const reportingDate = getLocalDateKey(new Date(instant));
      const reference = (() => {
        process.env.TZ = "Europe/Malta";
        return signature(instant);
      })();
      expect(reference.to).toBe(reportingDate);
      expect(reference.sparklineLengths.filter((n) => n >= 2).length).toBeGreaterThanOrEqual(2);
      for (const tz of ["UTC", "America/New_York"]) {
        process.env.TZ = tz;
        expect(signature(instant), `${instant} under ${tz}`).toEqual(reference);
      }
    }
  }, 60_000);
});

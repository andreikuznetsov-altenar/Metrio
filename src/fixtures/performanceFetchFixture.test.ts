import { describe, expect, it } from "vitest";
import { buildVisualPerformanceFetchResult } from "./performanceFetchFixture";
import { buildPerformanceViewModels } from "../services/performance/performanceViewModel";

describe("performanceFetchFixture", () => {
  it("builds view models with KPI context and sparklines", () => {
    const data = buildVisualPerformanceFetchResult("30d", "team", "team");
    const vm = buildPerformanceViewModels(data, "person-sam");
    expect(vm.teamOverview.summary.find((m) => m.label === "Efficiency")?.status).toBeTruthy();
    expect(
      vm.teamOverview.trends.filter((t) => (t.sparkline?.length ?? 0) >= 2).length,
    ).toBeGreaterThanOrEqual(2);
    expect(vm.teamOverview.attention.length).toBeGreaterThan(0);
    expect(vm.teamSecondary.deliveryRisk.length).toBeGreaterThan(0);
  });
});

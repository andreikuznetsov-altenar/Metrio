import { describe, expect, it, vi } from "vitest";
import { createPerformanceDateRange } from "../performance/performanceDateRange";
import type { PerformanceReviewTarget } from "../performance";
import {
  formatPerformanceAnalyticsReconciliation,
  reconcilePerformanceAnalytics,
} from "./kpiReconciliation";

const runReal = process.env.METRIO_REAL_RECONCILE === "1";

vi.mock("@tauri-apps/api/core", async () => {
  if (!runReal) {
    return { invoke: vi.fn() };
  }
  const { metrioRealInvoke } = await import("../../test/helpers/metrioRealInvoke");
  return {
    invoke: (command: string, args?: Record<string, unknown>) =>
      metrioRealInvoke(command, args),
  };
});

describe.skipIf(!runReal)("real Jira KPI reconciliation", () => {
  it(
    "reconciles dashboard KPIs with analytics evidence for standard ranges",
    async () => {
      const { fetchPerformanceData } = await import(
        "../../services/performance/performanceDataService"
      );
      const { loadPreferences } = await import("../../platform/preferences");

      const prefs = await loadPreferences();
      const customRange = {
        from: prefs.reportFilters.dateFrom,
        to: prefs.reportFilters.dateTo,
        preset: "custom" as const,
      };

      const scenarios: Array<{
        label: string;
        range: ReturnType<typeof createPerformanceDateRange> | typeof customRange;
        target: PerformanceReviewTarget;
      }> = [
        { label: "7d team", range: createPerformanceDateRange("7d"), target: "team" },
        { label: "30d team", range: createPerformanceDateRange("30d"), target: "team" },
        { label: "quarter team", range: createPerformanceDateRange("quarter"), target: "team" },
        { label: "custom team", range: customRange, target: "team" },
      ];

      for (const scenario of scenarios) {
        const data = await fetchPerformanceData(scenario.range, scenario.target, "team");
        const reconciliation = reconcilePerformanceAnalytics(
          data.reportData,
          scenario.target,
        );
        const report = formatPerformanceAnalyticsReconciliation(reconciliation);
        // eslint-disable-next-line no-console -- intentional diagnostic output for local runs
        console.info(`\n--- ${scenario.label} ---\n${report}\n`);
        expect(
          reconciliation.allMatch,
          `KPI reconciliation failed for ${scenario.label}\n${report}`,
        ).toBe(true);
      }
    },
    600_000,
  );
});

import type { PerformanceReviewTarget } from "../performance";
import type { PerformanceFetchResult } from "../../services/performance/performanceTypes";
import {
  formatKpiReconciliationReport,
  formatPerformanceAnalyticsReconciliation,
  reconcileAnalyticsKpiEvidence,
  reconcilePerformanceAnalytics,
  type KpiReconciliationReport,
} from "./kpiReconciliation";
import { writeLog } from "../../platform/logger";

declare global {
  interface Window {
    __metrioRunKpiReconciliation?: (
      reviewTarget?: PerformanceReviewTarget,
    ) => KpiReconciliationReport | null;
    __metrioLastKpiReconciliation?: KpiReconciliationReport;
  }
}

let lastFetchResult: PerformanceFetchResult | null = null;
let lastReviewTarget: PerformanceReviewTarget = "team";

export function registerKpiReconciliationDataSource(
  data: PerformanceFetchResult | null,
  reviewTarget: PerformanceReviewTarget,
): void {
  lastFetchResult = data;
  lastReviewTarget = reviewTarget;
  if (
    typeof window !== "undefined" &&
    data?.reportData &&
    new URLSearchParams(window.location.search).get("kpiReconcile") === "1"
  ) {
    queueMicrotask(() => logKpiReconciliation(data, reviewTarget));
  }
}

export function runKpiReconciliation(
  data: PerformanceFetchResult | null = lastFetchResult,
  reviewTarget: PerformanceReviewTarget = lastReviewTarget,
): KpiReconciliationReport | null {
  if (!data?.reportData) return null;
  const report = reconcileAnalyticsKpiEvidence(data.reportData, reviewTarget);
  if (typeof window !== "undefined") {
    window.__metrioLastKpiReconciliation = report;
  }
  return report;
}

export function logKpiReconciliation(
  data: PerformanceFetchResult | null = lastFetchResult,
  reviewTarget: PerformanceReviewTarget = lastReviewTarget,
): KpiReconciliationReport | null {
  const report = runKpiReconciliation(data, reviewTarget);
  if (!report) {
    console.warn("[KPI RECONCILIATION] No performance report data loaded.");
    return null;
  }
  if (data?.reportData) {
    const structured = reconcilePerformanceAnalytics(data.reportData, reviewTarget);
    const formatted = formatPerformanceAnalyticsReconciliation(structured);
    console.info(formatted);
    void writeLog("info", "app", "kpi_reconciliation", formatted);
    return report;
  }
  console.info(formatKpiReconciliationReport(report));
  return report;
}

/** Internal diagnostic helper (console + optional ?kpiReconcile=1 auto-run). */
export function installKpiReconciliationDevTools(): void {
  if (typeof window === "undefined") return;

  window.__metrioRunKpiReconciliation = (reviewTarget) =>
    logKpiReconciliation(lastFetchResult, reviewTarget ?? lastReviewTarget);
}

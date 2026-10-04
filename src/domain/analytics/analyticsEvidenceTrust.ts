import type { AnalyticsEvidence, AnalyticsDrilldownMetric } from "./analyticsEvidenceTypes";
import type { KpiData } from "../jira/types";

export const TASK_DETAIL_UNAVAILABLE_NOTE =
  "This KPI is available only as an aggregate. Task-level Jira detail is not available for this scope.";

export const ARCHIVED_AGGREGATE_NOTE =
  "Task-level detail is unavailable for this archived snapshot. Counts reflect stored aggregates only.";

export function kpiMetricCount(metric: AnalyticsDrilldownMetric, kpi: KpiData): number {
  switch (metric) {
    case "completed":
      return kpi.completedCount;
    case "backflows":
      return kpi.backflowCount;
    case "first_pass":
      return kpi.completedCount;
    case "avg_cycle":
      return kpi.completedCount;
    case "efficiency":
      return kpi.completedCount;
    default:
      return 0;
  }
}

export function evidenceCycleCount(evidence: AnalyticsEvidence): number {
  if (evidence.detailLevel === "aggregate") return 0;
  if (evidence.metric === "backflows") {
    const events = evidence.issues.reduce(
      (sum, row) => sum + (row.backflowCount ?? 0),
      0,
    );
    return evidence.bucketDate ? events : evidence.issues.length;
  }
  if (evidence.metric === "first_pass") {
    const completedCycles = evidence.summaryLines.find(
      (line) => line.label === "Completed cycles",
    )?.value;
    if (completedCycles != null) return Number(completedCycles);
    return evidence.issues.length;
  }
  if (evidence.metric === "avg_cycle") {
    return evidence.issues.length;
  }
  if (evidence.metric === "completed") {
    return evidence.bucketDate != null
      ? evidence.issues.length
      : evidence.totalCountable;
  }
  return evidence.issues.length;
}

/** Metric headline must never contradict list/summary evidence. */
export function analyticsEvidenceInvariant(evidence: AnalyticsEvidence): boolean {
  if (evidence.detailLevel === "aggregate") {
    const kpiCount = kpiMetricCount(evidence.metric, evidence.kpi);
    if (kpiCount > 0 && evidence.issues.length > 0) return false;
    return true;
  }

  if (evidence.metric === "efficiency") {
    return evidence.kpi.completedCount === 0 || evidence.issues.length > 0;
  }

  const kpiCount = kpiMetricCount(evidence.metric, evidence.kpi);
  const cycles = evidenceCycleCount(evidence);

  if (kpiCount > 0 && cycles === 0) return false;
  if (evidence.metric === "completed" && !evidence.bucketDate) {
    return kpiCount === cycles && evidence.issues.length === cycles;
  }
  if (evidence.metric === "first_pass") {
    const firstPass = Number(
      evidence.summaryLines.find((line) => line.label === "First pass")?.value ?? -1,
    );
    const rework = Number(
      evidence.summaryLines.find((line) => line.label === "Rework")?.value ?? -1,
    );
    if (firstPass < 0 || rework < 0) return false;
    return firstPass + rework === cycles;
  }
  if (evidence.metric === "backflows" && !evidence.bucketDate) {
    return kpiCount === cycles;
  }
  if (evidence.metric === "avg_cycle") {
    return kpiCount === 0 || cycles > 0;
  }
  return true;
}

export function downgradeToAggregateIfNeeded(
  evidence: AnalyticsEvidence,
  cycleCount: number,
): AnalyticsEvidence {
  if (evidence.detailLevel === "aggregate") return evidence;
  if (evidence.metric === "efficiency") return evidence;

  const kpiCount = kpiMetricCount(evidence.metric, evidence.kpi);
  if (kpiCount > 0 && cycleCount === 0) {
    return {
      ...evidence,
      detailLevel: "aggregate",
      issues: [],
      totalCountable: 0,
      summaryLines: [],
      efficiencyComponents: undefined,
      aggregateNote: TASK_DETAIL_UNAVAILABLE_NOTE,
    };
  }
  return evidence;
}

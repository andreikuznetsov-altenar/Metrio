import type { PerformanceReviewTarget } from "../performance";
import { getEfficiencyScoreBreakdown } from "../jira/kpi";
import type { AuditReportData } from "../jira/types";
import { buildAnalyticsEvidence } from "./buildAnalyticsEvidence";
import {
  buildIssueAttributionIndex,
  flattenTeamKpiIssues,
  targetScopeLabel,
} from "./analyticsReportScope";
import {
  collectReportingPeriodCycles,
  backflowEventsInCycle,
  type ReportingCycleRecord,
} from "./kpiCycleEvidence";

/** Stable cycle identity for reconciliation diagnostics (matches KPI cycle units). */
export function reportingCycleKey(record: ReportingCycleRecord): string {
  return `${record.issue.issueKey}#${record.cycleIndex}`;
}

export interface KpiReconciliationMetricResult {
  metric: string;
  semantic: string;
  matches: boolean;
  dashboardValue: string;
  evidenceValue: string;
  details?: string;
}

export interface KpiReconciliationSpotCheck {
  issueKey: string;
  completedAt: string;
  outcome: string;
  cycleDurationMs: number | null;
  backflowCount: number;
}

export interface KpiReconciliationReport {
  range: { from: string; to: string };
  target: string;
  teamScope?: string;
  results: KpiReconciliationMetricResult[];
  allMatch: boolean;
  spotCheckSamples: KpiReconciliationSpotCheck[];
}

const MS_TOLERANCE = 1;

function buildEvidenceBundle(
  reportData: AuditReportData,
  reviewTarget: PerformanceReviewTarget,
) {
  const issues = flattenTeamKpiIssues(reportData.grouped);
  const attributionIndex = buildIssueAttributionIndex(reportData.grouped);
  const params = reportData.params;
  const kpi = reportData.teamKpi;
  const rangeLabel = `${params.dateFrom} – ${params.dateTo}`;

  const base = {
    issues,
    params,
    kpi,
    attributionIndex,
    rangeLabel,
    targetLabel: targetScopeLabel(reviewTarget),
    issuesAvailable: issues.length > 0,
  };

  return {
    kpi,
    params,
    issues,
    records: collectReportingPeriodCycles(issues, params),
    completed: buildAnalyticsEvidence({ ...base, metric: "completed" }),
    firstPass: buildAnalyticsEvidence({ ...base, metric: "first_pass" }),
    backflows: buildAnalyticsEvidence({
      ...base,
      metric: "backflows",
      trendBackflowEvents: false,
    }),
    avgCycle: buildAnalyticsEvidence({ ...base, metric: "avg_cycle" }),
    efficiency: buildAnalyticsEvidence({ ...base, metric: "efficiency" }),
  };
}

function cycleKeys(records: ReportingCycleRecord[]): string[] {
  return records.map(reportingCycleKey).sort();
}

function firstPassCounts(records: ReportingCycleRecord[]) {
  let numerator = 0;
  for (const record of records) {
    if (record.cycle.isFirstPass) numerator += 1;
  }
  return { numerator, denominator: records.length };
}

function avgMsFromRecords(records: ReportingCycleRecord[]): number | null {
  const durations = records
    .map((record) => record.cycle.reviewToDone.fullCycleMs)
    .filter((value): value is number => value != null && value >= 0);
  if (!durations.length) return null;
  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
}


function spotCheckSamples(
  records: ReportingCycleRecord[],
  limit = 3,
): KpiReconciliationSpotCheck[] {
  return records.slice(0, limit).map((record) => ({
    issueKey: record.issue.issueKey,
    completedAt: record.completedAt,
    outcome: record.cycle.isFirstPass
      ? "first_pass"
      : record.cycle.hasBackflow
        ? "backflow"
        : "rework",
    cycleDurationMs: record.cycle.reviewToDone.fullCycleMs ?? null,
    backflowCount: record.cycle.hasBackflow ? 1 : 0,
  }));
}

export function reconcileAnalyticsKpiEvidence(
  reportData: AuditReportData,
  reviewTarget: PerformanceReviewTarget,
): KpiReconciliationReport {
  const bundle = buildEvidenceBundle(reportData, reviewTarget);
  const { kpi, params, records } = bundle;
  const results: KpiReconciliationMetricResult[] = [];

  const dashboardCompleted = kpi.completedCount;
  const evidenceCompleted = bundle.completed.issues.length;
  const dashboardCycleKeys = cycleKeys(records);
  const evidenceCompletedKeys = bundle.completed.issues
    .map((row) => row.issueKey)
    .sort();
  const completedMatches =
    dashboardCompleted === evidenceCompleted &&
    dashboardCompleted === bundle.completed.totalCountable &&
    dashboardCompleted === records.length;
  results.push({
    metric: "Completed",
    semantic: "Completed cycles in reporting window (review→done endedAt in range)",
    matches: completedMatches,
    dashboardValue: String(dashboardCompleted),
    evidenceValue: String(evidenceCompleted),
    details: completedMatches
      ? undefined
      : `dashboard cycles: ${dashboardCycleKeys.join(", ") || "—"}; evidence issue keys: ${evidenceCompletedKeys.join(", ") || "—"}`,
  });

  const dashboardFp = firstPassCounts(records);
  const evidenceFpNum = Number(
    bundle.firstPass.summaryLines.find((line) => line.label === "First pass")?.value ?? -1,
  );
  const evidenceFpDen = Number(
    bundle.firstPass.summaryLines.find((line) => line.label === "Completed cycles")?.value ??
      -1,
  );
  const dashboardRate =
    dashboardFp.denominator > 0
      ? Math.round((dashboardFp.numerator / dashboardFp.denominator) * 100)
      : 0;
  const evidenceRate =
    evidenceFpDen > 0 ? Math.round((evidenceFpNum / evidenceFpDen) * 100) : 0;

  const fpMatches =
    dashboardFp.numerator === kpi.firstPassAcceptedCount &&
    dashboardFp.denominator === kpi.completedCount &&
    dashboardFp.numerator === evidenceFpNum &&
    dashboardFp.denominator === evidenceFpDen &&
    dashboardRate === evidenceRate;

  results.push({
    metric: "First pass",
    semantic: "First-pass accepted cycles / completed cycles (integer counts before %)",
    matches: fpMatches,
    dashboardValue: `${kpi.firstPassAcceptedCount}/${kpi.completedCount} (${dashboardRate}%)`,
    evidenceValue: `${evidenceFpNum}/${evidenceFpDen} (${evidenceRate}%)`,
    details: fpMatches
      ? undefined
      : records
          .map(
            (record) =>
              `${reportingCycleKey(record)} isFirstPass=${record.cycle.isFirstPass}`,
          )
          .join("; "),
  });

  const backflowCycles = records.filter((record) => record.cycle.hasBackflow);
  const evidenceBackflowCycles = Number(
    bundle.backflows.summaryLines.find((line) => line.label === "Cycles with backflow")
      ?.value ?? -1,
  );
  const backflowMatches =
    kpi.backflowCount === backflowCycles.length &&
    kpi.backflowCount === evidenceBackflowCycles &&
    kpi.backflowCount === bundle.backflows.totalCountable;
  results.push({
    metric: "Backflows",
    semantic:
      "KPI card counts cycles with hasBackflow in period (not raw backflow event count)",
    matches: backflowMatches,
    dashboardValue: `${kpi.backflowCount} cycles`,
    evidenceValue: `${evidenceBackflowCycles} cycles`,
    details: backflowMatches
      ? undefined
      : backflowCycles
          .map((record) => {
            const events = backflowEventsInCycle(record.issue, record.cycle);
            const stamps = events.map((event) => event.changedAt).join("|");
            return `${reportingCycleKey(record)} events=${events.length} at ${stamps || "—"}`;
          })
          .join("; "),
  });

  const dashboardAvgMs = kpi.avgTodoToApprovedMs;
  const evidenceDurations = bundle.avgCycle.issues
    .map((row) => row.cycleDurationMs)
    .filter((value): value is number => value != null);
  const evidenceAvgMs =
    evidenceDurations.length > 0
      ? evidenceDurations.reduce((sum, value) => sum + value, 0) / evidenceDurations.length
      : null;
  const recordAvgMs = avgMsFromRecords(records);
  const avgMatches =
    (dashboardAvgMs == null && evidenceAvgMs == null) ||
    (dashboardAvgMs != null &&
      evidenceAvgMs != null &&
      Math.abs(dashboardAvgMs - evidenceAvgMs) <= MS_TOLERANCE &&
      recordAvgMs != null &&
      Math.abs(dashboardAvgMs - recordAvgMs) <= MS_TOLERANCE);

  results.push({
    metric: "Avg cycle",
    semantic: "Average full cycle ms (todo→done) over completed cycles in range",
    matches: avgMatches,
    dashboardValue: dashboardAvgMs == null ? "—" : String(Math.round(dashboardAvgMs)),
    evidenceValue: evidenceAvgMs == null ? "—" : String(Math.round(evidenceAvgMs)),
    details: avgMatches
      ? undefined
      : records
          .map(
            (record) =>
              `${reportingCycleKey(record)} ms=${record.cycle.reviewToDone.fullCycleMs ?? "—"}`,
          )
          .join("; "),
  });

  const breakdown = getEfficiencyScoreBreakdown({
    startedCount: kpi.startedCount,
    completedCount: kpi.completedCount,
    firstPassAcceptedCount: kpi.firstPassAcceptedCount,
    backflowCount: kpi.backflowCount,
    avgProgressToReviewMs: kpi.avgProgressToReviewMs,
    targetReviewDays: kpi.targetReviewDays,
  });

  const evidenceEfficiencyTotal = Number.parseInt(
    bundle.efficiency.valueLabel.replace("%", ""),
    10,
  );
  const efficiencyMatches =
    kpi.efficiencyIndex === breakdown.total &&
    kpi.efficiencyIndex === evidenceEfficiencyTotal;

  const evidenceById = new Map(
    (bundle.efficiency.efficiencyComponents ?? []).map((component) => [
      component.id,
      component.valueLabel,
    ]),
  );
  const componentSpecs: Array<{
    metric: string;
    id: "completion" | "first_pass" | "speed" | "backflow";
    dashboardValue: number;
  }> = [
    { metric: "Efficiency · Completion pts", id: "completion", dashboardValue: breakdown.completionScore },
    { metric: "Efficiency · First pass pts", id: "first_pass", dashboardValue: breakdown.firstPassScore },
    { metric: "Efficiency · Cycle time pts", id: "speed", dashboardValue: breakdown.speedScore },
    { metric: "Efficiency · Backflow penalty", id: "backflow", dashboardValue: breakdown.backflowPenalty },
  ];

  results.push({
    metric: "Efficiency",
    semantic:
      "Composite score + component points from getEfficiencyScoreBreakdown (35/35/30 − penalty)",
    matches: efficiencyMatches,
    dashboardValue: String(kpi.efficiencyIndex),
    evidenceValue: String(evidenceEfficiencyTotal),
    details: efficiencyMatches
      ? undefined
      : `components completion=${breakdown.completionScore} firstPass=${breakdown.firstPassScore} speed=${breakdown.speedScore} penalty=${breakdown.backflowPenalty}`,
  });

  for (const spec of componentSpecs) {
    const label = evidenceById.get(spec.id) ?? "";
    const match = label.match(/(\d+)/);
    const evidencePoints = match ? Number(match[1]) : null;
    const matches =
      evidencePoints != null && evidencePoints === spec.dashboardValue;
    results.push({
      metric: spec.metric,
      semantic: "Efficiency score component (must match breakdown + evidence drawer)",
      matches,
      dashboardValue: String(spec.dashboardValue),
      evidenceValue: evidencePoints == null ? label || "—" : String(evidencePoints),
    });
  }

  const allMatch = results.every((result) => result.matches);

  return {
    range: { from: params.dateFrom, to: params.dateTo },
    target: targetScopeLabel(reviewTarget),
    teamScope: params.teamScope,
    results,
    allMatch,
    spotCheckSamples: spotCheckSamples(records),
  };
}

export function formatKpiReconciliationReport(report: KpiReconciliationReport): string {
  const lines: string[] = [
    "[KPI RECONCILIATION]",
    "",
    "Range:",
    `${report.range.from} -> ${report.range.to}`,
    "",
    "Target:",
    report.target + (report.teamScope ? ` (${report.teamScope} scope)` : ""),
    "",
  ];

  for (const result of report.results) {
    lines.push(`${result.metric}:`);
    lines.push(`semantic=${result.semantic}`);
    lines.push(`dashboard=${result.dashboardValue}`);
    lines.push(`evidence=${result.evidenceValue}`);
    lines.push(result.matches ? "PASS" : "FAIL");
    if (result.details) {
      lines.push(`details=${result.details}`);
    }
    lines.push("");
  }

  if (report.spotCheckSamples.length) {
    lines.push("Spot check (manual Jira verification):");
    for (const sample of report.spotCheckSamples) {
      lines.push(
        `- ${sample.issueKey} completed=${sample.completedAt} outcome=${sample.outcome} cycleMs=${sample.cycleDurationMs ?? "—"} backflows=${sample.backflowCount}`,
      );
    }
    lines.push("");
  }

  lines.push(report.allMatch ? "OVERALL: PASS" : "OVERALL: FAIL");
  return lines.join("\n");
}

import type { PerformanceReviewTarget } from "../performance";
import type { AuditReportData } from "../jira/types";
import { buildAnalyticsEvidence } from "./buildAnalyticsEvidence";
import {
  buildIssueAttributionIndex,
  flattenTeamKpiIssues,
  targetScopeLabel,
} from "./analyticsReportScope";
import {
  collectReportingPeriodCycles,
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
  /** 1 when the sampled completed cycle needed at least one qualifying backflow. */
  reworkedCycle: 0 | 1;
}

export interface KpiReconciliationReport {
  range: { from: string; to: string };
  target: string;
  teamScope?: string;
  results: KpiReconciliationMetricResult[];
  allMatch: boolean;
  spotCheckSamples: KpiReconciliationSpotCheck[];
}

export interface PerformanceAnalyticsReconciliation {
  range: { from: string; to: string };
  target: string;
  teamScope?: string;
  completed: {
    dashboard: number;
    evidence: number;
    reportingCycles: number;
    matches: boolean;
    cycleDiagnostics?: string;
  };
  firstPass: {
    dashboardNumerator: number;
    dashboardDenominator: number;
    evidenceNumerator: number;
    evidenceDenominator: number;
    evidenceRework: number;
    reworkSumMatches: boolean;
    matches: boolean;
    cycleDiagnostics?: string;
  };
  backflows: {
    dashboardEvents: number;
    evidenceEvents: number;
    matches: boolean;
    semantic: string;
  };
  avgCycle: {
    dashboardMs: number | null;
    evidenceMs: number | null;
    matches: boolean;
    cycleDiagnostics?: string;
  };
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
  };
}

function firstPassCounts(records: ReportingCycleRecord[]) {
  let numerator = 0;
  for (const record of records) {
    if (record.cycle.isFirstPass) numerator += 1;
  }
  return { numerator, denominator: records.length };
}

function medianMsFromRecords(records: ReportingCycleRecord[]): number | null {
  const durations = records
    .map((record) => record.cycle.reviewToDone.fullCycleMs)
    .filter((value): value is number => value != null && value >= 0)
    .sort((a, b) => a - b);
  if (!durations.length) return null;
  const midpoint = Math.floor(durations.length / 2);
  return durations.length % 2
    ? durations[midpoint]
    : Math.round((durations[midpoint - 1] + durations[midpoint]) / 2);
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
    reworkedCycle: record.cycle.hasBackflow ? 1 : 0,
  }));
}

function cycleDiagnosticLines(records: ReportingCycleRecord[]): string {
  return records
    .map((record) => `${reportingCycleKey(record)} completedAt=${record.completedAt}`)
    .join("; ");
}

export function reconcilePerformanceAnalytics(
  reportData: AuditReportData,
  reviewTarget: PerformanceReviewTarget,
): PerformanceAnalyticsReconciliation {
  const bundle = buildEvidenceBundle(reportData, reviewTarget);
  const { kpi, params, records } = bundle;

  const dashboardCompleted = kpi.completedCount;
  const evidenceCompleted = bundle.completed.issues.length;
  const completedMatches =
    dashboardCompleted === evidenceCompleted &&
    dashboardCompleted === bundle.completed.totalCountable &&
    dashboardCompleted === records.length;

  const dashboardFp = firstPassCounts(records);
  const evidenceFpNum = Number(
    bundle.firstPass.summaryLines.find((line) => line.label === "First pass")?.value ?? -1,
  );
  const evidenceFpDen = Number(
    bundle.firstPass.summaryLines.find((line) => line.label === "Completed cycles")?.value ??
      -1,
  );
  const evidenceRework = Number(
    bundle.firstPass.summaryLines.find((line) => line.label === "Rework")?.value ?? -1,
  );
  const reworkSumMatches = evidenceFpNum + evidenceRework === evidenceFpDen;
  const fpMatches =
    dashboardFp.numerator === kpi.firstPassAcceptedCount &&
    dashboardFp.denominator === kpi.completedCount &&
    dashboardFp.numerator === evidenceFpNum &&
    dashboardFp.denominator === evidenceFpDen &&
    reworkSumMatches;

  const evidenceBackflowEvents = Number(
    bundle.backflows.summaryLines.find((line) => line.label === "Backflow events")?.value ?? -1,
  );
  const backflowSemantic = "Qualifying backward workflow transitions occurring in the reporting period";
  const backflowMatches =
    (kpi.backflowEventCount) === evidenceBackflowEvents &&
    (kpi.backflowEventCount) === bundle.backflows.totalCountable;

  const dashboardAvgMs = kpi.medianCycleMs ?? kpi.avgTodoToApprovedMs;
  const evidenceDurations = bundle.avgCycle.issues
    .map((row) => row.cycleDurationMs)
    .filter((value): value is number => value != null);
  const sortedEvidenceDurations = evidenceDurations.sort((a, b) => a - b);
  const evidenceMidpoint = Math.floor(sortedEvidenceDurations.length / 2);
  const evidenceAvgMs = sortedEvidenceDurations.length === 0
    ? null
    : sortedEvidenceDurations.length % 2
      ? sortedEvidenceDurations[evidenceMidpoint]
      : Math.round((sortedEvidenceDurations[evidenceMidpoint - 1] + sortedEvidenceDurations[evidenceMidpoint]) / 2);
  const recordAvgMs = medianMsFromRecords(records);
  const avgMatches =
    (dashboardAvgMs == null && evidenceAvgMs == null) ||
    (dashboardAvgMs != null &&
      evidenceAvgMs != null &&
      recordAvgMs != null &&
      Math.abs(dashboardAvgMs - evidenceAvgMs) <= MS_TOLERANCE &&
      Math.abs(dashboardAvgMs - recordAvgMs) <= MS_TOLERANCE);

  const structured: PerformanceAnalyticsReconciliation = {
    range: { from: params.dateFrom, to: params.dateTo },
    target: targetScopeLabel(reviewTarget),
    teamScope: params.teamScope,
    completed: {
      dashboard: dashboardCompleted,
      evidence: evidenceCompleted,
      reportingCycles: records.length,
      matches: completedMatches,
      cycleDiagnostics: completedMatches ? undefined : cycleDiagnosticLines(records),
    },
    firstPass: {
      dashboardNumerator: kpi.firstPassAcceptedCount,
      dashboardDenominator: kpi.completedCount,
      evidenceNumerator: evidenceFpNum,
      evidenceDenominator: evidenceFpDen,
      evidenceRework,
      reworkSumMatches,
      matches: fpMatches,
      cycleDiagnostics: fpMatches
        ? undefined
        : records
            .map(
              (record) =>
                `${reportingCycleKey(record)} isFirstPass=${record.cycle.isFirstPass}`,
            )
            .join("; "),
    },
    backflows: {
      dashboardEvents: kpi.backflowEventCount,
      evidenceEvents: evidenceBackflowEvents,
      matches: backflowMatches,
      semantic: backflowSemantic,
    },
    avgCycle: {
      dashboardMs: dashboardAvgMs,
      evidenceMs: evidenceAvgMs,
      matches: avgMatches,
      cycleDiagnostics: avgMatches
        ? undefined
        : records
            .map(
              (record) =>
                `${reportingCycleKey(record)} ms=${record.cycle.reviewToDone.fullCycleMs ?? "—"}`,
            )
            .join("; "),
    },
    allMatch:
      completedMatches &&
      fpMatches &&
      backflowMatches &&
      avgMatches,
    spotCheckSamples: spotCheckSamples(records),
  };

  return structured;
}

export function reconcileAnalyticsKpiEvidence(
  reportData: AuditReportData,
  reviewTarget: PerformanceReviewTarget,
): KpiReconciliationReport {
  const structured = reconcilePerformanceAnalytics(reportData, reviewTarget);
  const fp = structured.firstPass;
  const dashboardRate =
    fp.dashboardDenominator > 0
      ? Math.round((fp.dashboardNumerator / fp.dashboardDenominator) * 100)
      : 0;
  const evidenceRate =
    fp.evidenceDenominator > 0
      ? Math.round((fp.evidenceNumerator / fp.evidenceDenominator) * 100)
      : 0;

  const results: KpiReconciliationMetricResult[] = [
    {
      metric: "Completed",
      semantic: "Completed cycles in reporting window (review→done endedAt in range)",
      matches: structured.completed.matches,
      dashboardValue: String(structured.completed.dashboard),
      evidenceValue: String(structured.completed.evidence),
      details: structured.completed.cycleDiagnostics,
    },
    {
      metric: "First pass",
      semantic:
        "First-pass accepted cycles / completed cycles (integer counts; firstPass + rework = completed)",
      matches: structured.firstPass.matches,
      dashboardValue: `${fp.dashboardNumerator}/${fp.dashboardDenominator} (${dashboardRate}%)`,
      evidenceValue: `${fp.evidenceNumerator}/${fp.evidenceDenominator} (${evidenceRate}%)`,
      details: structured.firstPass.cycleDiagnostics,
    },
    {
      metric: "Backflow events",
      semantic: structured.backflows.semantic,
      matches: structured.backflows.matches,
      dashboardValue: `${structured.backflows.dashboardEvents} events`,
      evidenceValue: `${structured.backflows.evidenceEvents} events`,
    },
    {
      metric: "Median cycle",
      semantic: "Median business-window cycle duration over completed cycles in range",
      matches: structured.avgCycle.matches,
      dashboardValue:
        structured.avgCycle.dashboardMs == null
          ? "—"
          : String(Math.round(structured.avgCycle.dashboardMs)),
      evidenceValue:
        structured.avgCycle.evidenceMs == null
          ? "—"
          : String(Math.round(structured.avgCycle.evidenceMs)),
      details: structured.avgCycle.cycleDiagnostics,
    },
  ];

  return {
    range: structured.range,
    target: structured.target,
    teamScope: structured.teamScope,
    results,
    allMatch: structured.allMatch,
    spotCheckSamples: structured.spotCheckSamples,
  };
}

export function formatPerformanceAnalyticsReconciliation(
  reconciliation: PerformanceAnalyticsReconciliation,
): string {
  const msToHours = (value: number | null) =>
    value == null ? "—" : `${(value / 3600000).toFixed(1)}h`;

  const lines = [
    "KPI RECONCILIATION",
    "",
    "Range:",
    `${reconciliation.range.from} -> ${reconciliation.range.to}`,
    "",
    "Target:",
    reconciliation.target +
      (reconciliation.teamScope ? ` (${reconciliation.teamScope} scope)` : ""),
    "",
    "Completed",
    `dashboard: ${reconciliation.completed.dashboard}`,
    `evidence: ${reconciliation.completed.evidence}`,
    reconciliation.completed.matches ? "PASS" : "FAIL",
    "",
    "First pass",
    `dashboard: ${reconciliation.firstPass.dashboardNumerator} / ${reconciliation.firstPass.dashboardDenominator}`,
    `evidence: ${reconciliation.firstPass.evidenceNumerator} / ${reconciliation.firstPass.evidenceDenominator}`,
    reconciliation.firstPass.matches ? "PASS" : "FAIL",
    "",
    "Backflow events",
    `dashboard events: ${reconciliation.backflows.dashboardEvents}`,
    `events: ${reconciliation.backflows.evidenceEvents}`,
    reconciliation.backflows.matches ? "PASS" : "FAIL",
    "",
    "Median cycle",
    `dashboard: ${msToHours(reconciliation.avgCycle.dashboardMs)}`,
    `evidence: ${msToHours(reconciliation.avgCycle.evidenceMs)}`,
    reconciliation.avgCycle.matches ? "PASS" : "FAIL",
    "",
    "Overall:",
    reconciliation.allMatch ? "PASS" : "FAIL",
  ];

  if (reconciliation.spotCheckSamples.length) {
    lines.push("", "Spot check (manual Jira verification):");
    for (const sample of reconciliation.spotCheckSamples) {
      lines.push(
        `- ${sample.issueKey} completed=${sample.completedAt} outcome=${sample.outcome} cycleMs=${sample.cycleDurationMs ?? "—"} reworkedCycle=${sample.reworkedCycle}`,
      );
    }
  }

  return lines.join("\n");
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
        `- ${sample.issueKey} completed=${sample.completedAt} outcome=${sample.outcome} cycleMs=${sample.cycleDurationMs ?? "—"} reworkedCycle=${sample.reworkedCycle}`,
      );
    }
    lines.push("");
  }

  lines.push(report.allMatch ? "OVERALL: PASS" : "OVERALL: FAIL");
  return lines.join("\n");
}

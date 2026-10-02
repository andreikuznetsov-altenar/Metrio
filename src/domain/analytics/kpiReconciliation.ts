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
    dashboardCycles: number;
    evidenceCycles: number;
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
  efficiency: {
    dashboardScore: number;
    evidenceScore: number;
    completionPoints: number;
    firstPassPoints: number;
    speedPoints: number;
    backflowPenalty: number;
    componentMatches: boolean;
    matches: boolean;
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
    efficiency: buildAnalyticsEvidence({ ...base, metric: "efficiency" }),
  };
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

function cycleDiagnosticLines(records: ReportingCycleRecord[]): string {
  return records
    .map((record) => `${reportingCycleKey(record)} completedAt=${record.completedAt}`)
    .join("; ");
}

function parseEvidencePoints(valueLabel: string): number | null {
  const match = valueLabel.match(/(\d+)/);
  return match ? Number(match[1]) : null;
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

  const evidenceBackflowCycles = Number(
    bundle.backflows.summaryLines.find((line) => line.label === "Cycles with backflow")
      ?.value ?? -1,
  );
  const evidenceBackflowEvents = Number(
    bundle.backflows.summaryLines.find((line) => line.label === "Backflow events")?.value ?? -1,
  );
  const backflowSemantic =
    "KPI card counts cycles with hasBackflow in period (not raw backflow event count)";
  const backflowMatches =
    kpi.backflowCount === records.filter((record) => record.cycle.hasBackflow).length &&
    kpi.backflowCount === evidenceBackflowCycles &&
    kpi.backflowCount === bundle.backflows.totalCountable;

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
      recordAvgMs != null &&
      Math.abs(dashboardAvgMs - evidenceAvgMs) <= MS_TOLERANCE &&
      Math.abs(dashboardAvgMs - recordAvgMs) <= MS_TOLERANCE);

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
  const evidenceById = new Map(
    (bundle.efficiency.efficiencyComponents ?? []).map((component) => [
      component.id,
      component.valueLabel,
    ]),
  );
  const completionPoints = parseEvidencePoints(evidenceById.get("completion") ?? "") ?? -1;
  const firstPassPoints = parseEvidencePoints(evidenceById.get("first_pass") ?? "") ?? -1;
  const speedPoints = parseEvidencePoints(evidenceById.get("speed") ?? "") ?? -1;
  const backflowPenalty = parseEvidencePoints(evidenceById.get("backflow") ?? "") ?? -1;
  const componentMatches =
    completionPoints === breakdown.completionScore &&
    firstPassPoints === breakdown.firstPassScore &&
    speedPoints === breakdown.speedScore &&
    backflowPenalty === breakdown.backflowPenalty;
  const efficiencyMatches =
    kpi.efficiencyIndex === breakdown.total &&
    kpi.efficiencyIndex === evidenceEfficiencyTotal &&
    componentMatches;

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
      dashboardCycles: kpi.backflowCount,
      evidenceCycles: evidenceBackflowCycles,
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
    efficiency: {
      dashboardScore: kpi.efficiencyIndex,
      evidenceScore: evidenceEfficiencyTotal,
      completionPoints: breakdown.completionScore,
      firstPassPoints: breakdown.firstPassScore,
      speedPoints: breakdown.speedScore,
      backflowPenalty: breakdown.backflowPenalty,
      componentMatches,
      matches: efficiencyMatches,
    },
    allMatch:
      completedMatches &&
      fpMatches &&
      backflowMatches &&
      avgMatches &&
      efficiencyMatches,
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
      metric: "Backflows",
      semantic: structured.backflows.semantic,
      matches: structured.backflows.matches,
      dashboardValue: `${structured.backflows.dashboardCycles} cycles`,
      evidenceValue: `${structured.backflows.evidenceCycles} cycles (${structured.backflows.evidenceEvents} events)`,
    },
    {
      metric: "Avg cycle",
      semantic: "Average full cycle ms (todo→done) over completed cycles in range",
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
    {
      metric: "Efficiency",
      semantic:
        "Composite score + component points from getEfficiencyScoreBreakdown (35/35/30 − penalty)",
      matches: structured.efficiency.matches,
      dashboardValue: String(structured.efficiency.dashboardScore),
      evidenceValue: String(structured.efficiency.evidenceScore),
      details: structured.efficiency.componentMatches
        ? undefined
        : `components completion=${structured.efficiency.completionPoints} firstPass=${structured.efficiency.firstPassPoints} speed=${structured.efficiency.speedPoints} penalty=${structured.efficiency.backflowPenalty}`,
    },
    {
      metric: "Efficiency · Completion pts",
      semantic: "Efficiency score component",
      matches: structured.efficiency.componentMatches,
      dashboardValue: String(structured.efficiency.completionPoints),
      evidenceValue: String(structured.efficiency.completionPoints),
    },
    {
      metric: "Efficiency · First pass pts",
      semantic: "Efficiency score component",
      matches: structured.efficiency.componentMatches,
      dashboardValue: String(structured.efficiency.firstPassPoints),
      evidenceValue: String(structured.efficiency.firstPassPoints),
    },
    {
      metric: "Efficiency · Cycle time pts",
      semantic: "Efficiency score component",
      matches: structured.efficiency.componentMatches,
      dashboardValue: String(structured.efficiency.speedPoints),
      evidenceValue: String(structured.efficiency.speedPoints),
    },
    {
      metric: "Efficiency · Backflow penalty",
      semantic: "Efficiency score component",
      matches: structured.efficiency.componentMatches,
      dashboardValue: String(structured.efficiency.backflowPenalty),
      evidenceValue: String(structured.efficiency.backflowPenalty),
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
    "Backflows",
    `dashboard cycles: ${reconciliation.backflows.dashboardCycles}`,
    `evidence cycles: ${reconciliation.backflows.evidenceCycles}`,
    `events: ${reconciliation.backflows.evidenceEvents}`,
    reconciliation.backflows.matches ? "PASS" : "FAIL",
    "",
    "Avg cycle",
    `dashboard: ${msToHours(reconciliation.avgCycle.dashboardMs)}`,
    `evidence: ${msToHours(reconciliation.avgCycle.evidenceMs)}`,
    reconciliation.avgCycle.matches ? "PASS" : "FAIL",
    "",
    "Efficiency",
    `dashboard: ${reconciliation.efficiency.dashboardScore}`,
    `evidence: ${reconciliation.efficiency.evidenceScore}`,
    `components: ${reconciliation.efficiency.componentMatches ? "PASS" : "FAIL"}`,
    "",
    "Overall:",
    reconciliation.allMatch ? "PASS" : "FAIL",
  ];

  if (reconciliation.spotCheckSamples.length) {
    lines.push("", "Spot check (manual Jira verification):");
    for (const sample of reconciliation.spotCheckSamples) {
      lines.push(
        `- ${sample.issueKey} completed=${sample.completedAt} outcome=${sample.outcome} cycleMs=${sample.cycleDurationMs ?? "—"} backflows=${sample.backflowCount}`,
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
        `- ${sample.issueKey} completed=${sample.completedAt} outcome=${sample.outcome} cycleMs=${sample.cycleDurationMs ?? "—"} backflows=${sample.backflowCount}`,
      );
    }
    lines.push("");
  }

  lines.push(report.allMatch ? "OVERALL: PASS" : "OVERALL: FAIL");
  return lines.join("\n");
}

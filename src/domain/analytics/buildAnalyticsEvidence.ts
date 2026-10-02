import { format, parseISO } from "date-fns";
import { getEfficiencyScoreBreakdown } from "../jira/kpi";
import type { AuditIssue, KpiData, ReportParams } from "../jira/types";
import {
  analyticsDrilldownDescription,
  analyticsDrilldownTitle,
} from "./analyticsDrilldownCopy";
import type {
  AnalyticsDrilldownMetric,
  AnalyticsEvidence,
  AnalyticsEvidenceIssue,
  IssueAttribution,
} from "./analyticsEvidenceTypes";
import {
  backflowEventsInCycle,
  collectBackflowEventsOnDate,
  collectReportingPeriodCycles,
  cycleMatchesBucketDate,
  type ReportingCycleRecord,
} from "./kpiCycleEvidence";

export interface BuildAnalyticsEvidenceInput {
  metric: AnalyticsDrilldownMetric;
  issues: AuditIssue[];
  params: ReportParams;
  kpi: KpiData;
  attributionIndex: Record<string, IssueAttribution>;
  rangeLabel: string;
  targetLabel: string;
  comparisonLabel?: string;
  bucketDate?: string;
  /** Trend backflow chart uses event counts per day; KPI card uses cycle counts. */
  trendBackflowEvents?: boolean;
  personReportKey?: string;
  personDisplayName?: string;
  personId?: string;
  personKpi?: KpiData;
  issuesAvailable?: boolean;
}

function projectKeyFromIssue(issueKey: string): string | undefined {
  const idx = issueKey.indexOf("-");
  return idx > 0 ? issueKey.slice(0, idx) : undefined;
}

function formatShortDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return iso;
  }
}

function mapCycleRecord(
  record: ReportingCycleRecord,
  attributionIndex: Record<string, IssueAttribution>,
): AnalyticsEvidenceIssue {
  const { issue, cycle, cycleIndex, completedAt } = record;
  const attribution = attributionIndex[issue.issueKey];
  const fullCycleMs = cycle.reviewToDone.fullCycleMs ?? null;
  const backflowEvents = backflowEventsInCycle(issue, cycle);
  const outcome = cycle.isFirstPass ? "first_pass" : "rework";

  return {
    issueKey: issue.issueKey,
    title: issue.issueSummary,
    personId: attribution?.personCanonical,
    personName: attribution?.personName || issue.assigneeName,
    projectKey: projectKeyFromIssue(issue.issueKey),
    status: issue.currentStatus,
    completedAt,
    cycleDurationMs: fullCycleMs,
    cycleIndex,
    cycleLabel: cycleIndex > 1 ? `Cycle ${cycleIndex}` : undefined,
    outcome: cycle.hasBackflow ? "backflow" : outcome,
    backflowCount: backflowEvents.length,
    backflowEvents,
  };
}

function filterRecordsByBucket(
  records: ReportingCycleRecord[],
  bucketDate?: string,
): ReportingCycleRecord[] {
  if (!bucketDate) return records;
  return records.filter((record) => cycleMatchesBucketDate(record.completedAt, bucketDate));
}

function sortIssues(
  metric: AnalyticsDrilldownMetric,
  issues: AnalyticsEvidenceIssue[],
): AnalyticsEvidenceIssue[] {
  const copy = issues.slice();
  if (metric === "avg_cycle") {
    copy.sort(
      (a, b) => (b.cycleDurationMs ?? 0) - (a.cycleDurationMs ?? 0),
    );
    return copy;
  }
  if (metric === "backflows") {
    copy.sort((a, b) => (b.backflowCount ?? 0) - (a.backflowCount ?? 0));
    return copy;
  }
  copy.sort((a, b) => {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bTime - aTime;
  });
  return copy;
}

function valueLabelForMetric(metric: AnalyticsDrilldownMetric, kpi: KpiData, bucketDate?: string, bucketValue?: number): string {
  if (bucketDate && bucketValue != null) {
    if (metric === "first_pass") return `${bucketValue.toFixed(1)}%`;
    if (metric === "avg_cycle") return `${bucketValue.toFixed(1)}d`;
    return String(Math.round(bucketValue));
  }
  if (metric === "efficiency") return `${kpi.efficiencyIndex}%`;
  if (metric === "first_pass") {
    const rate =
      kpi.completedCount > 0
        ? Math.round((kpi.firstPassAcceptedCount / kpi.completedCount) * 100)
        : 0;
    return `${rate}%`;
  }
  if (metric === "avg_cycle") {
    if (kpi.avgTodoToApprovedMs == null) return "—";
    return `${(kpi.avgTodoToApprovedMs / 86400000).toFixed(1)}d`;
  }
  if (metric === "completed") return String(kpi.completedCount);
  return String(kpi.backflowCount);
}

export function buildAnalyticsEvidence(input: BuildAnalyticsEvidenceInput): AnalyticsEvidence {
  const {
    metric,
    issues,
    params,
    kpi: inputKpi,
    attributionIndex,
    rangeLabel,
    targetLabel,
    comparisonLabel,
    bucketDate,
    trendBackflowEvents = false,
    issuesAvailable,
    personReportKey,
    personKpi,
    personDisplayName,
    personId,
  } = input;

  const cycleIssues =
    personReportKey != null
      ? issues.filter(
          (issue) => attributionIndex[issue.issueKey]?.personCanonical === personReportKey,
        )
      : issues;
  const kpi = personReportKey != null && personKpi ? personKpi : inputKpi;
  const hasIssueDetail =
    issuesAvailable ??
    (personReportKey != null ? cycleIssues.length > 0 : issues.length > 0);
  const personScope =
    personDisplayName != null
      ? { personDisplayName, personId }
      : personId != null
        ? { personId }
        : {};

  const title = analyticsDrilldownTitle[metric];
  const description = analyticsDrilldownDescription[metric];

  if (!hasIssueDetail || !cycleIssues.length) {
    return {
      metric,
      title,
      valueLabel: valueLabelForMetric(metric, kpi),
      rangeLabel: bucketDate ? formatShortDate(`${bucketDate}T12:00:00.000Z`) : rangeLabel,
      targetLabel,
      comparisonLabel,
      description,
      detailLevel: "aggregate",
      aggregateNote:
        "Task-level detail is unavailable for this archived snapshot. Counts reflect stored aggregates only.",
      summaryLines: [],
      issues: [],
      totalCountable: 0,
      params,
      kpi,
      bucketDate,
      ...personScope,
    };
  }

  const allRecords = collectReportingPeriodCycles(cycleIssues, params);
  const scopedRecords = filterRecordsByBucket(allRecords, bucketDate);

  if (metric === "efficiency") {
    const breakdown = getEfficiencyScoreBreakdown({
      startedCount: kpi.startedCount,
      completedCount: kpi.completedCount,
      firstPassAcceptedCount: kpi.firstPassAcceptedCount,
      backflowCount: kpi.backflowCount,
      avgProgressToReviewMs: kpi.avgProgressToReviewMs,
      targetReviewDays: kpi.targetReviewDays,
    });

    const supporting = sortIssues(
      "completed",
      scopedRecords.map((record) => mapCycleRecord(record, attributionIndex)),
    ).slice(0, 25);

    return {
      metric,
      title,
      valueLabel: `${breakdown.total}%`,
      rangeLabel: bucketDate ? formatShortDate(`${bucketDate}T12:00:00.000Z`) : rangeLabel,
      targetLabel,
      comparisonLabel,
      description,
      detailLevel: "task",
      summaryLines: [
        {
          label: "Completion",
          value: `${Math.round(breakdown.completionRate * 100)}% (${breakdown.completionScore}/35)`,
        },
        {
          label: "First pass",
          value: `${Math.round(breakdown.firstPassRate * 100)}% (${breakdown.firstPassScore}/35)`,
        },
        {
          label: "Cycle time",
          value:
            breakdown.progressToReviewHours != null
              ? `${breakdown.progressToReviewHours.toFixed(1)}h vs ${breakdown.targetReviewHours}h target (${breakdown.speedScore}/30)`
              : `— (${breakdown.speedScore}/30)`,
        },
        {
          label: "Backflow penalty",
          value: `−${breakdown.backflowPenalty} (max 20)`,
        },
      ],
      efficiencyComponents: [
        {
          id: "completion",
          label: "Completion rate",
          valueLabel: `${breakdown.completionScore} pts`,
          detail: "Up to 35 points from completed vs started cycles.",
        },
        {
          id: "first_pass",
          label: "First pass rate",
          valueLabel: `${breakdown.firstPassScore} pts`,
          detail: "Up to 35 points from first-pass completions.",
        },
        {
          id: "speed",
          label: "Progress → review speed",
          valueLabel: `${breakdown.speedScore} pts`,
          detail: "Up to 30 points vs target review days.",
        },
        {
          id: "backflow",
          label: "Backflow penalty",
          valueLabel: `−${breakdown.backflowPenalty} pts`,
          detail: "Up to 20 points subtracted from backflow rate.",
        },
      ],
      issues: supporting,
      totalCountable: kpi.completedCount,
      params,
      kpi,
      bucketDate,
      ...personScope,
    };
  }

  if (metric === "backflows" && (trendBackflowEvents || bucketDate)) {
    const date = bucketDate || params.dateTo;
    const eventRows = collectBackflowEventsOnDate(cycleIssues, date);
    const mapped: AnalyticsEvidenceIssue[] = eventRows.map((row) => {
      const attribution = attributionIndex[row.issueKey];
      const latest = row.events[row.events.length - 1];
      return {
        issueKey: row.issue.issueKey,
        title: row.issue.issueSummary,
        personId: attribution?.personCanonical,
        personName: attribution?.personName || row.issue.assigneeName,
        projectKey: projectKeyFromIssue(row.issue.issueKey),
        status: row.issue.currentStatus,
        completedAt: latest?.changedAt,
        backflowCount: row.events.length,
        backflowEvents: row.events,
        outcome: "backflow",
      };
    });

    const totalEvents = mapped.reduce((sum, row) => sum + (row.backflowCount ?? 0), 0);

    return {
      metric,
      title,
      valueLabel: String(totalEvents),
      rangeLabel: bucketDate ? formatShortDate(`${bucketDate}T12:00:00.000Z`) : rangeLabel,
      targetLabel,
      comparisonLabel,
      description,
      detailLevel: "task",
      summaryLines: [
        { label: "Tasks with backflow", value: String(mapped.length) },
        { label: "Backflow events", value: String(totalEvents) },
      ],
      issues: sortIssues(metric, mapped),
      totalCountable: totalEvents,
      params,
      kpi,
      bucketDate,
      ...personScope,
    };
  }

  if (metric === "backflows") {
    const backflowRecords = scopedRecords.filter((record) => record.cycle.hasBackflow);
    const mapped = backflowRecords.map((record) => mapCycleRecord(record, attributionIndex));
    const totalEvents = mapped.reduce((sum, row) => sum + (row.backflowCount ?? 0), 0);

    return {
      metric,
      title,
      valueLabel: String(kpi.backflowCount),
      rangeLabel: bucketDate ? formatShortDate(`${bucketDate}T12:00:00.000Z`) : rangeLabel,
      targetLabel,
      comparisonLabel,
      description,
      detailLevel: "task",
      summaryLines: [
        { label: "Cycles with backflow", value: String(mapped.length) },
        { label: "Backflow events", value: String(totalEvents) },
      ],
      issues: sortIssues(metric, mapped),
      totalCountable: kpi.backflowCount,
      params,
      kpi,
      bucketDate,
      ...personScope,
    };
  }

  if (metric === "first_pass") {
    const mapped = scopedRecords.map((record) => mapCycleRecord(record, attributionIndex));
    const firstPass = mapped.filter((row) => row.outcome === "first_pass").length;
    const rework = mapped.filter(
      (row) => row.outcome === "rework" || row.outcome === "backflow",
    ).length;
    const rate =
      mapped.length > 0 ? Math.round((firstPass / mapped.length) * 100) : 0;

    return {
      metric,
      title,
      valueLabel: bucketDate ? `${rate}%` : valueLabelForMetric(metric, kpi),
      rangeLabel: bucketDate ? formatShortDate(`${bucketDate}T12:00:00.000Z`) : rangeLabel,
      targetLabel,
      comparisonLabel,
      description,
      detailLevel: "task",
      summaryLines: [
        { label: "First pass", value: String(firstPass) },
        { label: "Rework", value: String(rework) },
        { label: "Completed cycles", value: String(mapped.length) },
      ],
      issues: sortIssues(metric, mapped),
      totalCountable: mapped.length,
      params,
      kpi,
      bucketDate,
      ...personScope,
    };
  }

  if (metric === "avg_cycle") {
    const mapped = scopedRecords
      .map((record) => mapCycleRecord(record, attributionIndex))
      .filter((row) => row.cycleDurationMs != null);
    const avgMs =
      mapped.length > 0
        ? mapped.reduce((sum, row) => sum + (row.cycleDurationMs ?? 0), 0) / mapped.length
        : null;

    return {
      metric,
      title,
      valueLabel:
        avgMs != null ? `${(avgMs / 86400000).toFixed(1)}d` : valueLabelForMetric(metric, kpi),
      rangeLabel: bucketDate ? formatShortDate(`${bucketDate}T12:00:00.000Z`) : rangeLabel,
      targetLabel,
      comparisonLabel,
      description,
      detailLevel: "task",
      summaryLines: [
        { label: "Completed cycles", value: String(mapped.length) },
        {
          label: "Average cycle",
          value: avgMs != null ? `${(avgMs / 86400000).toFixed(1)} days` : "—",
        },
      ],
      issues: sortIssues(metric, mapped),
      totalCountable: mapped.length,
      params,
      kpi,
      bucketDate,
      ...personScope,
    };
  }

  // completed
  const mapped = scopedRecords.map((record) => mapCycleRecord(record, attributionIndex));

  return {
    metric,
    title,
    valueLabel: bucketDate ? String(mapped.length) : valueLabelForMetric(metric, kpi),
    rangeLabel: bucketDate ? formatShortDate(`${bucketDate}T12:00:00.000Z`) : rangeLabel,
    targetLabel,
    comparisonLabel,
    description,
    detailLevel: "task",
    summaryLines: [{ label: "Completed cycles", value: String(mapped.length) }],
    issues: sortIssues(metric, mapped),
    totalCountable: bucketDate ? mapped.length : kpi.completedCount,
    params,
    kpi,
    bucketDate,
    ...personScope,
  };
}

export function reconcileEvidenceCount(
  evidence: AnalyticsEvidence,
): boolean {
  if (evidence.detailLevel === "aggregate") return true;
  if (evidence.metric === "efficiency") return true;
  if (evidence.metric === "first_pass") {
    return evidence.issues.length === evidence.kpi.completedCount || Boolean(evidence.bucketDate);
  }
  if (evidence.metric === "completed") {
    return (
      evidence.totalCountable === evidence.issues.length &&
      (evidence.bucketDate != null || evidence.totalCountable === evidence.kpi.completedCount)
    );
  }
  if (evidence.metric === "backflows" && !evidence.bucketDate) {
    return evidence.totalCountable === evidence.kpi.backflowCount;
  }
  return true;
}

import type { AuditIssue, ReportParams } from "../jira/types";
import { getLocalDateKey } from "../periods/dateRange";
import {
  collectBackflowEventsOnDate,
  collectReportingPeriodCycles,
  cycleMatchesBucketDate,
} from "./kpiCycleEvidence";

export interface TrendChartPoint {
  date: string;
  value: number;
  issueKeys?: string[];
}

function uniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of keys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function issueKeysCompletedOnDate(
  issues: AuditIssue[],
  params: ReportParams,
  bucketDate: string,
): string[] {
  const records = collectReportingPeriodCycles(issues, params);
  return uniqueKeys(
    records
      .filter((record) => cycleMatchesBucketDate(record.completedAt, bucketDate))
      .map((record) => record.issue.issueKey),
  );
}

function issueKeysFirstPassOnDate(
  issues: AuditIssue[],
  params: ReportParams,
  bucketDate: string,
): string[] {
  const records = collectReportingPeriodCycles(issues, params);
  return uniqueKeys(
    records
      .filter(
        (record) =>
          cycleMatchesBucketDate(record.completedAt, bucketDate) &&
          record.cycle.isFirstPass &&
          !record.cycle.hasBackflow,
      )
      .map((record) => record.issue.issueKey),
  );
}

function issueKeysBackflowsOnDate(issues: AuditIssue[], bucketDate: string): string[] {
  return uniqueKeys(
    collectBackflowEventsOnDate(issues, bucketDate).map((row) => row.issueKey),
  );
}

export function enrichTrendChartSeries(
  trendLabel: string,
  issues: AuditIssue[],
  params: ReportParams,
  series: { date: string; value: number }[],
): TrendChartPoint[] {
  return series.map((point) => {
    let issueKeys: string[] = [];
    if (trendLabel === "Completed" || trendLabel === "Avg cycle") {
      issueKeys = issueKeysCompletedOnDate(issues, params, point.date);
    } else if (trendLabel === "First pass") {
      issueKeys = issueKeysFirstPassOnDate(issues, params, point.date);
    } else if (trendLabel === "Backflows") {
      issueKeys = issueKeysBackflowsOnDate(issues, point.date);
    }
    return issueKeys.length ? { ...point, issueKeys } : point;
  });
}

export function formatTrendPointModalContext(
  trendLabel: string,
  bucketDate: string,
): string {
  const dateLabel = formatTrendBucketDateLabel(bucketDate);
  if (trendLabel === "Completed") {
    return dateLabel;
  }
  return `${trendLabel}. ${dateLabel}`;
}

function formatTrendBucketDateLabel(bucketDate: string): string {
  const parsed = new Date(`${bucketDate}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return bucketDate;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function localDateKeyFromIso(iso: string): string {
  return getLocalDateKey(new Date(iso));
}

import type { AuditIssue, ReportParams } from "../jira/types";
import { getLocalDateKey } from "../periods/dateRange";
import { collectReportingPeriodCycles } from "./kpiCycleEvidence";
import { isProfileBackflow } from "../workflows/profileCycles";
import { resolveWorkflowProfile } from "../workflows/resolveWorkflowProfile";

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

function completedKeysByDate(
  issues: AuditIssue[],
  params: ReportParams,
  firstPassOnly: boolean,
): Map<string, string[]> {
  const byDate = new Map<string, string[]>();
  for (const record of collectReportingPeriodCycles(issues, params)) {
    if (
      firstPassOnly &&
      !(record.cycle.isFirstPass && !record.cycle.hasBackflow)
    ) {
      continue;
    }
    const day = localDateKeyFromIso(record.completedAt);
    const keys = byDate.get(day);
    if (keys) keys.push(record.issue.issueKey);
    else byDate.set(day, [record.issue.issueKey]);
  }
  return byDate;
}

function backflowKeysByDate(issues: AuditIssue[]): Map<string, string[]> {
  const byDate = new Map<string, string[]>();
  for (const issue of issues || []) {
    const profile = resolveWorkflowProfile(issue);
    const seen = new Set<string>();
    for (const event of issue.events || []) {
      if (event.eventType !== "Status") continue;
      if (!isProfileBackflow(profile, event.fromValue, event.toValue, event)) continue;
      const day = localDateKeyFromIso(event.changedAt);
      if (seen.has(day)) continue;
      seen.add(day);
      const keys = byDate.get(day);
      if (keys) keys.push(issue.issueKey);
      else byDate.set(day, [issue.issueKey]);
    }
  }
  return byDate;
}

export function enrichTrendChartSeries(
  trendLabel: string,
  issues: AuditIssue[],
  params: ReportParams,
  series: { date: string; value: number }[],
): TrendChartPoint[] {
  const keysByDate =
    trendLabel === "Completed" || trendLabel === "Avg cycle"
      ? completedKeysByDate(issues, params, false)
      : trendLabel === "First pass"
        ? completedKeysByDate(issues, params, true)
        : trendLabel === "Backflows"
          ? backflowKeysByDate(issues)
          : null;
  if (!keysByDate) return series;
  return series.map((point) => {
    const issueKeys = uniqueKeys(keysByDate.get(point.date) ?? []);
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

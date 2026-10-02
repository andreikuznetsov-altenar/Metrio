import { buildCompletedCyclesFromSegments, getCycleSegments } from "../jira/cycles";
import { isCompletedCycleInReportingPeriod } from "../jira/cycleKpi";
import { isDateWithinRange } from "../jira/dates";
import type { AuditIssue, CompletedCycle, ReportParams } from "../jira/types";

export interface ReportingCycleRecord {
  issue: AuditIssue;
  cycle: CompletedCycle;
  cycleIndex: number;
  completedAt: string;
}

/** Shared cycle selection used by KPI aggregation and analytics drill-down. */
export function collectReportingPeriodCycles(
  issues: AuditIssue[],
  params: ReportParams,
): ReportingCycleRecord[] {
  const records: ReportingCycleRecord[] = [];

  for (const issue of issues || []) {
    const segments = getCycleSegments(issue, params);
    const completedCycles = buildCompletedCyclesFromSegments(segments).filter((cycle) =>
      isCompletedCycleInReportingPeriod(cycle, params),
    );

    completedCycles.forEach((cycle, index) => {
      records.push({
        issue,
        cycle,
        cycleIndex: index + 1,
        completedAt: cycle.reviewToDone.endedAt,
      });
    });
  }

  return records;
}

export function backflowEventsInCycle(
  issue: AuditIssue,
  cycle: CompletedCycle,
): { changedAt: string; transitionLabel: string }[] {
  const start = cycle.reviewToDone.cycleTodoStartedAt;
  const end = cycle.reviewToDone.endedAt;
  if (!start || !end) return [];

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  return (issue.events || [])
    .filter((event) => {
      if (event.eventType !== "Status") return false;
      if (!event.isBackflow || event.excludeFromEfficiencyBackflow) return false;
      const t = new Date(event.changedAt).getTime();
      return t >= startMs && t <= endMs;
    })
    .map((event) => ({
      changedAt: event.changedAt,
      transitionLabel: `${event.fromValue || ""} → ${event.toValue || ""}`.trim(),
    }));
}

export function cycleMatchesBucketDate(completedAt: string, bucketDate: string): boolean {
  return isDateWithinRange(completedAt, {
    dateFrom: bucketDate,
    dateTo: bucketDate,
  });
}

export function collectBackflowEventsOnDate(
  issues: AuditIssue[],
  bucketDate: string,
): {
  issueKey: string;
  issue: AuditIssue;
  events: { changedAt: string; transitionLabel: string }[];
}[] {
  const rows: {
    issueKey: string;
    issue: AuditIssue;
    events: { changedAt: string; transitionLabel: string }[];
  }[] = [];

  for (const issue of issues) {
    const events = (issue.events || [])
      .filter((event) => {
        if (event.eventType !== "Status") return false;
        if (!event.isBackflow || event.excludeFromEfficiencyBackflow) return false;
        return cycleMatchesBucketDate(event.changedAt, bucketDate);
      })
      .map((event) => ({
        changedAt: event.changedAt,
        transitionLabel: `${event.fromValue || ""} → ${event.toValue || ""}`.trim(),
      }));

    if (events.length) {
      rows.push({ issueKey: issue.issueKey, issue, events });
    }
  }

  return rows;
}

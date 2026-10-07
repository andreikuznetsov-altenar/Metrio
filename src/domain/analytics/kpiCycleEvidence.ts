import { isDateWithinRange } from "../jira/dates";
import type { AuditIssue, CompletedCycle, ReportParams } from "../jira/types";
import { extractProfileContributorCycles, isProfileBackflow } from "../workflows/profileCycles";
import { resolveWorkflowProfile } from "../workflows/resolveWorkflowProfile";

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
    const profile = resolveWorkflowProfile(issue);
    const completedCycles = extractProfileContributorCycles(issue, profile)
      .filter((cycle) => cycle.completedAt && isDateWithinRange(cycle.completedAt, params))
      .map((cycle): CompletedCycle => ({
        progressToReview: cycle.progressToReviewMs == null
          ? null
          : {
              type: "progress_to_review",
              ms: cycle.progressToReviewMs,
              startedAt: cycle.startedAt,
              endedAt: cycle.completedAt!,
              hasBackflow: cycle.hasBackflow,
              cycleTodoStartedAt: cycle.startedAt,
              isCompleteCycle: true,
            },
        progressToHolds: [],
        reviewToDone: {
          type: "review_to_done",
          ms: cycle.reviewToDoneMs,
          startedAt: cycle.startedAt,
          endedAt: cycle.completedAt!,
          hasBackflow: cycle.hasBackflow,
          cycleTodoStartedAt: cycle.startedAt,
          fullCycleMs: cycle.fullCycleMs,
          isCompleteCycle: true,
        },
        hasBackflow: cycle.hasBackflow,
        isFirstPass: cycle.isFirstPass,
      }));

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
  const profile = resolveWorkflowProfile(issue);

  return (issue.events || [])
    .filter((event) => {
      if (event.eventType !== "Status") return false;
      if (!isProfileBackflow(profile, event.fromValue, event.toValue, event)) return false;
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
    const profile = resolveWorkflowProfile(issue);
    const events = (issue.events || [])
      .filter((event) => {
        if (event.eventType !== "Status") return false;
        if (!isProfileBackflow(profile, event.fromValue, event.toValue, event)) return false;
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

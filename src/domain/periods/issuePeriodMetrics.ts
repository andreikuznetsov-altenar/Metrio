import { addCompletedCycleToDailyFlow, emptyDailyFlow, type DailyFlowFields } from '../history/dailyFlowFields';
import { collectUniqueTeamIssues } from '../jira/uniqueIssues';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import type { DateRange } from './dateRange';
import { getCurrentWeekRange, getLastNDaysRange, getLocalDayRangeFromKey } from './dateRange';
import { getAllStatusEvents, withFullIssueHistory } from './issueCompletion';
import { isTimestampInRange } from './dateRange';
import { assigneeAt, extractCanonicalPerformanceCycles } from '../workflows/canonicalPerformance';
import { isWorkflowKpiEligible } from '../workflows/eligibility';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { attributedTo, median, ownerAllowed } from '../workflows/buildWorkflowKpi';
import { isProfileBackflow } from '../workflows/profileCycles';

import { appNow } from "../../platform/appClock";
export interface PeriodFlowMetrics {
  completedCount: number;
  firstPassCount: number;
  firstPassPercent: number;
  reworkedCycleCount: number;
  backflowEventCount: number;
  medianCycleMs: number | null;
  avgCycleMs: number | null;
}

export function computeIssuesFlowMetrics(
  issues: AuditIssue[],
  range: DateRange,
  _params: ReportParams,
  contributorCanonical?: string,
): PeriodFlowMetrics {
  let completedCount = 0;
  let firstPassCount = 0;
  let backflowEventCount = 0;
  const cycleTimes: number[] = [];

  for (const issue of issues) {
    // Same population as the KPI: ineligible issue types never contribute to a period metric.
    if (!isWorkflowKpiEligible(issue)) continue;
    const fullIssue = withFullIssueHistory(issue);

    const profile = resolveWorkflowProfile(fullIssue);
    const eventCount = (fullIssue.events || []).filter((event) =>
      event.eventType === 'Status' &&
      isTimestampInRange(event.changedAt, range) &&
      isProfileBackflow(profile, event.fromValue, event.toValue, event) &&
      (!contributorCanonical || assigneeAt(fullIssue, event.changedAt) === contributorCanonical)
    ).length;
    backflowEventCount += eventCount;

    for (const cycle of extractCanonicalPerformanceCycles(fullIssue, profile)) {
      if (!cycle.completedAt || !isTimestampInRange(cycle.completedAt, range)) continue;
      if (contributorCanonical && cycle.ownerCanonical && cycle.ownerCanonical !== contributorCanonical) continue;
      completedCount += 1;
      if (cycle.isFirstPass) firstPassCount += 1;
      if (cycle.cycleMs !== null) cycleTimes.push(cycle.cycleMs);
    }
  }

  return {
    completedCount,
    firstPassCount,
    firstPassPercent:
      completedCount > 0 ? Math.round((firstPassCount / completedCount) * 10000) / 100 : 0,
    reworkedCycleCount: completedCount - firstPassCount,
    backflowEventCount,
    medianCycleMs: median(cycleTimes),
    avgCycleMs:
      cycleTimes.length > 0
        ? cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length
        : null,
  };
}

export function computePersonFlowMetrics(
  person: Person,
  range: DateRange,
  _params: ReportParams,
): PeriodFlowMetrics {
  return computeIssuesFlowMetrics(person.issues, range, _params, person.jira?.canonicalKey);
}

export function computeTeamFlowMetrics(
  persons: Person[],
  range: DateRange,
  params: ReportParams,
): PeriodFlowMetrics {
  const issues = collectUniqueTeamIssues(persons);
  return computeIssuesFlowMetrics(issues, range, params);
}

export function getCurrentWeekFlowMetrics(
  person: Person,
  params: ReportParams,
  now = appNow(),
): PeriodFlowMetrics {
  return computePersonFlowMetrics(person, getCurrentWeekRange(now), params);
}

export function getLastWeeksFlowMetrics(
  person: Person,
  params: ReportParams,
  weeks = 4,
  now = appNow(),
): PeriodFlowMetrics {
  return computePersonFlowMetrics(person, getLastNDaysRange(weeks * 7, now), params);
}

/**
 * Backflow events in `range`. With `contributorCanonical` only events that happened while that
 * person owned the issue count (same attribution as the KPI), and issue types the KPI excludes
 * never count.
 */
export function countBackflowsInRange(
  issues: AuditIssue[],
  range: DateRange,
  contributorCanonical?: string,
): number {
  const options = { contributorCanonical };
  const unique = [...new Map(issues.map((issue) => [issue.issueKey, issue])).values()];
  return unique.reduce((sum, issue) => {
    if (!isWorkflowKpiEligible(issue)) return sum;
    const fullIssue = withFullIssueHistory(issue);
    const profile = resolveWorkflowProfile(fullIssue);
    return sum + getAllStatusEvents(fullIssue).filter(
      (event) =>
        isProfileBackflow(profile, event.fromValue, event.toValue, event) &&
        isTimestampInRange(event.changedAt, range) &&
        ownerAllowed(assigneeAt(fullIssue, event.changedAt), options),
    ).length;
  }, 0);
}

/**
 * Completed cycles in `range`, counted per issue (an issue can complete more than once). With
 * `contributorCanonical` a cycle must belong to that person (canonical owner, same rule as the KPI
 * and Work History); issue types the KPI excludes never count. The sum over the map is the KPI's
 * completed-cycle count for the same scope and range.
 */
export function countCompletedCyclesByIssue(
  issues: AuditIssue[],
  range: DateRange,
  contributorCanonical?: string,
): Map<string, number> {
  const options = { contributorCanonical };
  const counts = new Map<string, number>();
  const unique = [...new Map(issues.map((issue) => [issue.issueKey, issue])).values()];
  for (const issue of unique) {
    if (!isWorkflowKpiEligible(issue)) continue;
    const fullIssue = withFullIssueHistory(issue);
    const profile = resolveWorkflowProfile(fullIssue);
    const n = extractCanonicalPerformanceCycles(fullIssue, profile).filter(
      (cycle) =>
        cycle.completedAt &&
        isTimestampInRange(cycle.completedAt, range) &&
        attributedTo(cycle, contributorCanonical) &&
        ownerAllowed(cycle.ownerCanonical, options),
    ).length;
    if (n > 0) counts.set(issue.issueKey, n);
  }
  return counts;
}

/** Issues with at least one completed cycle in `range`, one entry per issue (see above). */
export function listCompletedIssuesInRange(
  issues: AuditIssue[],
  range: DateRange,
  contributorCanonical?: string,
): AuditIssue[] {
  const counts = countCompletedCyclesByIssue(issues, range, contributorCanonical);
  const unique = [...new Map(issues.map((issue) => [issue.issueKey, issue])).values()];
  return unique.filter((issue) => counts.has(issue.issueKey));
}

export function countDailyFlowOnDate(
  issues: AuditIssue[],
  dateKey: string,
  _params: ReportParams,
  contributorCanonical?: string,
): DailyFlowFields {
  const range: DateRange = getLocalDayRangeFromKey(dateKey);
  const bucket = emptyDailyFlow();

  for (const issue of issues) {
    // Daily snapshots record the same metric population as the KPI.
    if (!isWorkflowKpiEligible(issue)) continue;
    const fullIssue = withFullIssueHistory(issue);
    const profile = resolveWorkflowProfile(fullIssue);
    for (const cycle of extractCanonicalPerformanceCycles(fullIssue, profile)) {
      if (!cycle.completedAt || !isTimestampInRange(cycle.completedAt, range)) continue;
      if (contributorCanonical && cycle.ownerCanonical && cycle.ownerCanonical !== contributorCanonical) continue;
      addCompletedCycleToDailyFlow(bucket, cycle, contributorCanonical);
    }
    bucket.backflowsOnDate += (fullIssue.events || []).filter((event) =>
      event.eventType === 'Status' &&
      isTimestampInRange(event.changedAt, range) &&
      isProfileBackflow(profile, event.fromValue, event.toValue, event) &&
      (!contributorCanonical || assigneeAt(fullIssue, event.changedAt) === contributorCanonical)
    ).length;
  }

  return bucket;
}

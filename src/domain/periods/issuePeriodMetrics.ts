import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import { collectUniqueTeamIssues } from '../jira/uniqueIssues';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { Person } from '../people/types';
import type { DateRange } from './dateRange';
import { getCurrentWeekRange, getLastNDaysRange } from './dateRange';
import {
  countBackflowEventsInRange,
  getIssueCompletionAt,
  getIssueFullCycleMs,
  isIssueCompletedInRange,
  withFullIssueHistory,
} from './issueCompletion';
import { isTimestampInRange } from './dateRange';

export interface PeriodFlowMetrics {
  completedCount: number;
  firstPassCount: number;
  firstPassPercent: number;
  backflowCount: number;
  avgCycleMs: number | null;
}

export function computeIssuesFlowMetrics(
  issues: AuditIssue[],
  range: DateRange,
  params: ReportParams,
): PeriodFlowMetrics {
  let completedCount = 0;
  let firstPassCount = 0;
  let backflowCount = 0;
  const cycleTimes: number[] = [];

  for (const issue of issues) {
    const fullIssue = withFullIssueHistory(issue);

    // Backflow is an event metric — count all qualifying events in range,
    // regardless of whether the issue completed during the period.
    backflowCount += countBackflowEventsInRange(fullIssue, range);

    // First Pass is completion-based: only issues whose final completion is in range.
    if (!isIssueCompletedInRange(fullIssue, range)) continue;

    completedCount += 1;
    const health = classifyTaskHealth({ issue: fullIssue, params });
    if (health.isFirstPass) firstPassCount += 1;

    const cycleMs = getIssueFullCycleMs(fullIssue);
    if (cycleMs !== null) cycleTimes.push(cycleMs);
  }

  return {
    completedCount,
    firstPassCount,
    firstPassPercent:
      completedCount > 0 ? Math.round((firstPassCount / completedCount) * 10000) / 100 : 0,
    backflowCount,
    avgCycleMs:
      cycleTimes.length > 0
        ? cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length
        : null,
  };
}

export function computePersonFlowMetrics(
  person: Person,
  range: DateRange,
  params: ReportParams,
): PeriodFlowMetrics {
  return computeIssuesFlowMetrics(person.issues, range, params);
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
  now = new Date(),
): PeriodFlowMetrics {
  return computePersonFlowMetrics(person, getCurrentWeekRange(now), params);
}

export function getLastWeeksFlowMetrics(
  person: Person,
  params: ReportParams,
  weeks = 4,
  now = new Date(),
): PeriodFlowMetrics {
  return computePersonFlowMetrics(person, getLastNDaysRange(weeks * 7, now), params);
}

export function countBackflowsInRange(issues: AuditIssue[], range: DateRange): number {
  return issues.reduce(
    (sum, issue) => sum + countBackflowEventsInRange(withFullIssueHistory(issue), range),
    0,
  );
}

export function listCompletedIssuesInRange(
  issues: AuditIssue[],
  range: DateRange,
): AuditIssue[] {
  return issues.filter((issue) => isIssueCompletedInRange(withFullIssueHistory(issue), range));
}

export function countDailyFlowOnDate(
  issues: AuditIssue[],
  dateKey: string,
  params: ReportParams,
): {
  completedOnDate: number;
  backflowsOnDate: number;
  firstPassOnDate: number;
  cycleMsSumOnDate: number;
  completedWithCycleOnDate: number;
} {
  const dayStart = new Date(`${dateKey}T00:00:00`);
  const dayEnd = new Date(`${dateKey}T23:59:59.999`);
  const range: DateRange = { start: dayStart, end: dayEnd };

  let completedOnDate = 0;
  let backflowsOnDate = 0;
  let firstPassOnDate = 0;
  let cycleMsSumOnDate = 0;
  let completedWithCycleOnDate = 0;

  for (const issue of issues) {
    const fullIssue = withFullIssueHistory(issue);
    const completedAt = getIssueCompletionAt(fullIssue);
    if (completedAt && isTimestampInRange(completedAt, range)) {
      completedOnDate += 1;
      const health = classifyTaskHealth({ issue: fullIssue, params });
      if (health.isFirstPass) firstPassOnDate += 1;
      const cycleMs = getIssueFullCycleMs(fullIssue);
      if (cycleMs !== null) {
        cycleMsSumOnDate += cycleMs;
        completedWithCycleOnDate += 1;
      }
    }
    backflowsOnDate += countBackflowEventsInRange(fullIssue, range);
  }

  return {
    completedOnDate,
    backflowsOnDate,
    firstPassOnDate,
    cycleMsSumOnDate,
    completedWithCycleOnDate,
  };
}

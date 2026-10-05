import { getWorkingDurationMs } from '../jira/dates';
import { isDateWithinRange } from '../jira/dates';
import type { AuditIssue, KpiData, ReportParams } from '../jira/types';
import { calculateWskinsEfficiencyIndex } from './wskinsEfficiency';
import { normalizeStatusKey } from './normalizeStatus';

function wskinsStatusMatches(statusValue: string, names: string[]): boolean {
  const normalized = normalizeStatusKey(statusValue);
  return names.some((name) => normalized === normalizeStatusKey(name));
}

function isWskinsSubtaskIssue(issue: AuditIssue): boolean {
  return Boolean(issue.isSubtask) || normalizeStatusKey(issue.issueTypeName || '') === 'sub task';
}

export interface WskinsIssueKpiContribution {
  startedCount: number;
  reviewSubmittedCount: number;
  completedCount: number;
  backflowCount: number;
  workDurationsMs: number[];
}

/** Port of `calculateWSkinsMainTaskKpiContribution_`. */
export function calculateWskinsMainTaskKpiContribution(
  issue: AuditIssue,
  params: ReportParams,
): WskinsIssueKpiContribution {
  const events = (issue.events || [])
    .filter((e) => e.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  const backflowCount = 0;
  const workDurationsMs: number[] = [];

  let inProgressStartedAt: string | null = null;
  let startedMarked = false;
  let reviewSubmittedMarked = false;
  let completedMarked = false;

  events.forEach((e) => {
    const toStatus = e.toValue || '';
    const eventInRange = isDateWithinRange(e.changedAt, params);

    if (wskinsStatusMatches(toStatus, ['In Progress'])) {
      if (eventInRange && !startedMarked) {
        startedCount++;
        startedMarked = true;
      }
      if (!completedMarked) {
        inProgressStartedAt = e.changedAt;
      }
      return;
    }

    if (
      inProgressStartedAt &&
      wskinsStatusMatches(toStatus, ['Internal Review']) &&
      eventInRange &&
      !completedMarked
    ) {
      if (!reviewSubmittedMarked) {
        reviewSubmittedCount++;
        reviewSubmittedMarked = true;
      }
      completedCount++;
      completedMarked = true;

      const ms = getWorkingDurationMs(inProgressStartedAt, e.changedAt);
      if (ms !== null && ms > 0) {
        workDurationsMs.push(ms);
      }
      inProgressStartedAt = null;
    }
  });

  return {
    startedCount,
    reviewSubmittedCount,
    completedCount,
    backflowCount,
    workDurationsMs,
  };
}

/** Port of `calculateWSkinsSubtaskKpiContribution_`. */
export function calculateWskinsSubtaskKpiContribution(
  issue: AuditIssue,
  params: ReportParams,
): WskinsIssueKpiContribution {
  const events = (issue.events || [])
    .filter((e) => e.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let backflowCount = 0;
  const workDurationsMs: number[] = [];

  let activeWorkStartedAt: string | null = null;
  let completedMarked = false;

  events.forEach((e) => {
    const toStatus = e.toValue || '';
    const eventInRange = isDateWithinRange(e.changedAt, params);

    if (e.isBackflow && !e.excludeFromEfficiencyBackflow && eventInRange) {
      backflowCount++;
    }

    if (wskinsStatusMatches(toStatus, ['In Progress'])) {
      if (eventInRange) {
        startedCount++;
        activeWorkStartedAt = e.changedAt;
      } else {
        activeWorkStartedAt = null;
      }
      return;
    }

    if (
      activeWorkStartedAt &&
      wskinsStatusMatches(toStatus, ['On approval']) &&
      eventInRange
    ) {
      reviewSubmittedCount++;
      const ms = getWorkingDurationMs(activeWorkStartedAt, e.changedAt);
      if (ms !== null && ms > 0) {
        workDurationsMs.push(ms);
      }
      activeWorkStartedAt = null;
      return;
    }

    if (!completedMarked && wskinsStatusMatches(toStatus, ['Done']) && eventInRange) {
      completedCount++;
      completedMarked = true;
    }
  });

  return {
    startedCount,
    reviewSubmittedCount,
    completedCount,
    backflowCount,
    workDurationsMs,
  };
}

export function calculateWskinsIssueKpiContribution(
  issue: AuditIssue,
  params: ReportParams,
): WskinsIssueKpiContribution {
  return isWskinsSubtaskIssue(issue)
    ? calculateWskinsSubtaskKpiContribution(issue, params)
    : calculateWskinsMainTaskKpiContribution(issue, params);
}

function averageWskinsMs(items: number[]): number | null {
  if (!items.length) return null;
  return Math.round(items.reduce((a, b) => a + b, 0) / items.length);
}

/** Port of `buildWSkinsKpiFromIssues_`. */
export function buildWskinsKpiFromIssues(
  issues: AuditIssue[],
  params: ReportParams,
): KpiData {
  const allDurations: number[] = [];
  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let backflowCount = 0;

  (issues || []).forEach((issue) => {
    const issueResult = calculateWskinsIssueKpiContribution(issue, params);
    startedCount += issueResult.startedCount;
    reviewSubmittedCount += issueResult.reviewSubmittedCount;
    completedCount += issueResult.completedCount;
    backflowCount += issueResult.backflowCount;
    issueResult.workDurationsMs.forEach((v) => {
      if (v !== null && v !== undefined && !Number.isNaN(v) && v >= 0) {
        allDurations.push(v);
      }
    });
  });

  const avgProgressToReviewMs = averageWskinsMs(allDurations);
  const targetReviewDays = Number(params?.targetReviewDays ?? 3);

  return {
    startedCount,
    reviewSubmittedCount,
    completedCount,
    firstPassAcceptedCount: 0,
    holdCount: 0,
    backflowCount,
    avgProgressToReviewMs,
    avgReviewToDoneMs: null,
    avgProgressToHoldMs: null,
    avgTodoToApprovedMs: null,
    targetReviewDays,
    efficiencyIndex: calculateWskinsEfficiencyIndex({
      startedCount,
      reviewSubmittedCount,
      completedCount,
      backflowCount,
      avgProgressToReviewMs,
      targetReviewDays,
    }).total,
  };
}

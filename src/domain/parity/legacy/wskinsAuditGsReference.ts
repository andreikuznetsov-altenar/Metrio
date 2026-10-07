/**
 * TEST-ONLY verbatim port of legacy Google Apps Script WSkins KPI.
 *
 * Source: docs/canonical-legacy/apps-script/WskinsAudit.gs
 * Functions: buildWSkinsKpiFromIssues_, calculateWSkinsMainTaskKpiContribution_,
 * calculateWSkinsSubtaskKpiContribution_, calculateWSkinsEfficiencyIndex_.
 *
 * Shared date helpers (`getWorkingDurationMs_`, `isDateWithinRange_`) live in
 * Code.gs and are reused via the UX oracle — WSkinsAudit.gs calls those names.
 *
 * `normalizeStatusText_` is invoked by WskinsAudit.gs but not defined in the
 * vendored files; production and this oracle use trim+lowercase (same as
 * Code.gs `normalizeTeamIdentity_`).
 *
 * Do not import production `wskinsKpi.ts` here.
 */
import type { AuditIssue, KpiData, ReportParams } from '../../jira/types';
import {
  legacyGetWorkingDurationMs_,
  legacyIsDateWithinRange_,
} from './uxCodeGsReference';

function normalizeStatusText_(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function isWSkinsOneOfStatuses_(value: string, names: string[]): boolean {
  const normalized = normalizeStatusText_(value);
  return names.some((name) => normalized === normalizeStatusText_(name));
}

/** WskinsAudit.gs `isWSkinsSubtaskIssueObject_` */
function isWSkinsSubtaskIssueObject_(issue: AuditIssue): boolean {
  return !!(issue && issue.isSubtask);
}

export interface LegacyWskinsIssueKpiContribution {
  startedCount: number;
  reviewSubmittedCount: number;
  completedCount: number;
  backflowCount: number;
  workDurationsMs: number[];
}

/** WskinsAudit.gs `calculateWSkinsMainTaskKpiContribution_` */
export function legacyCalculateWSkinsMainTaskKpiContribution_(
  issue: AuditIssue,
  params: ReportParams,
): LegacyWskinsIssueKpiContribution {
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
    const toStatus = normalizeStatusText_(e.toValue || '');
    const eventInRange = legacyIsDateWithinRange_(e.changedAt, params);

    if (isWSkinsOneOfStatuses_(toStatus, ['in progress'])) {
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
      isWSkinsOneOfStatuses_(toStatus, ['internal review']) &&
      eventInRange &&
      !completedMarked
    ) {
      if (!reviewSubmittedMarked) {
        reviewSubmittedCount++;
        reviewSubmittedMarked = true;
      }
      completedCount++;
      completedMarked = true;

      const ms = legacyGetWorkingDurationMs_(inProgressStartedAt, e.changedAt);
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

/** WskinsAudit.gs `calculateWSkinsSubtaskKpiContribution_` */
export function legacyCalculateWSkinsSubtaskKpiContribution_(
  issue: AuditIssue,
  params: ReportParams,
): LegacyWskinsIssueKpiContribution {
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
    const toStatus = normalizeStatusText_(e.toValue || '');
    const eventInRange = legacyIsDateWithinRange_(e.changedAt, params);

    if (e.isBackflow && !e.excludeFromEfficiencyBackflow && eventInRange) {
      backflowCount++;
    }

    if (isWSkinsOneOfStatuses_(toStatus, ['in progress'])) {
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
      isWSkinsOneOfStatuses_(toStatus, ['on approval']) &&
      eventInRange
    ) {
      reviewSubmittedCount++;
      const ms = legacyGetWorkingDurationMs_(activeWorkStartedAt, e.changedAt);
      if (ms !== null && ms > 0) {
        workDurationsMs.push(ms);
      }
      activeWorkStartedAt = null;
      return;
    }

    if (!completedMarked && isWSkinsOneOfStatuses_(toStatus, ['done']) && eventInRange) {
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

/** WskinsAudit.gs `averageWSkinsMs_` */
function averageWSkinsMs_(items: number[]): number | null {
  if (!items || !items.length) return null;
  const sum = items.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / items.length);
}

/** WskinsAudit.gs `calculateWSkinsEfficiencyIndex_` (base 40, completion 45, speed 20/17/13/9/4 default 10, penalty cap 35, clamp 1–100) */
export function legacyCalculateWSkinsEfficiencyIndex_(data: {
  startedCount: number;
  reviewSubmittedCount: number;
  completedCount: number;
  backflowCount: number;
  avgProgressToReviewMs: number | null;
  targetReviewDays: number;
}): number {
  const startedCount = Number(data.startedCount || 0);
  const reviewSubmittedCount = Number(data.reviewSubmittedCount || 0);
  const completedCount = Number(data.completedCount || 0);
  const backflowCount = Number(data.backflowCount || 0);
  const targetReviewDays = Number(data.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  const hasActivity = startedCount > 0 || reviewSubmittedCount > 0 || completedCount > 0;
  if (!hasActivity) {
    return 0;
  }

  const baseScore = 40;
  const completionBase = Math.max(startedCount, reviewSubmittedCount, 1);
  const completionRate = completedCount / completionBase;
  const completionScore = Math.min(45, Math.round(completionRate * 45));

  const progressToReviewHours = data.avgProgressToReviewMs
    ? data.avgProgressToReviewMs / 3600000
    : null;

  let progressToReviewScore = 10;
  if (progressToReviewHours !== null) {
    if (progressToReviewHours <= targetReviewHours) {
      progressToReviewScore = 20;
    } else if (progressToReviewHours <= targetReviewHours + 24) {
      progressToReviewScore = 17;
    } else if (progressToReviewHours <= targetReviewHours + 48) {
      progressToReviewScore = 13;
    } else if (progressToReviewHours <= targetReviewHours + 96) {
      progressToReviewScore = 9;
    } else {
      progressToReviewScore = 4;
    }
  }

  const backflowBase = Math.max(startedCount, 1);
  const backflowRate = backflowCount / backflowBase;
  const backflowPenalty = Math.min(35, Math.round(backflowRate * 20));

  const rawScore = baseScore + completionScore + progressToReviewScore - backflowPenalty;
  return Math.max(1, Math.min(100, Math.round(rawScore)));
}

/** WskinsAudit.gs `buildWSkinsKpiFromIssues_` */
export function legacyBuildWSkinsKpiFromIssues_(
  issues: AuditIssue[],
  params: ReportParams,
): KpiData {
  const allDurations: number[] = [];
  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let backflowCount = 0;

  (issues || []).forEach((issue) => {
    const issueResult = isWSkinsSubtaskIssueObject_(issue)
      ? legacyCalculateWSkinsSubtaskKpiContribution_(issue, params)
      : legacyCalculateWSkinsMainTaskKpiContribution_(issue, params);

    startedCount += Number(issueResult.startedCount || 0);
    reviewSubmittedCount += Number(issueResult.reviewSubmittedCount || 0);
    completedCount += Number(issueResult.completedCount || 0);
    backflowCount += Number(issueResult.backflowCount || 0);

    (issueResult.workDurationsMs || []).forEach((v) => {
      if (v !== null && v !== undefined && !Number.isNaN(v) && v >= 0) {
        allDurations.push(v);
      }
    });
  });

  const avgProgressToReviewMs = averageWSkinsMs_(allDurations);
  const targetReviewDays = Number(params?.targetReviewDays ? params.targetReviewDays : 3);

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
    efficiencyIndex: legacyCalculateWSkinsEfficiencyIndex_({
      startedCount,
      reviewSubmittedCount,
      completedCount,
      avgProgressToReviewMs,
      backflowCount,
      targetReviewDays,
    }),
  };
}

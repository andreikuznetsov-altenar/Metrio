/**
 * TEST-ONLY verbatim port of legacy Google Apps Script UX KPI.
 *
 * Source: docs/canonical-legacy/apps-script/Code.gs
 * Functions: getWorkingDurationMs_, isDateWithinRange_, getStatusEventsSorted_,
 * getCycleSegments_, buildCompletedCyclesFromSegments_, buildKpiFromIssues_,
 * calculateEfficiencyIndex_, flattenGroupedIssues_ (via flattenLegacyGroupedIssues).
 *
 * Do not import production Metrio KPI / cycle engines here.
 * This module is the Apps Script oracle for PASS 14.4.
 */
import type {
  AuditIssue,
  CompletedCycle,
  CycleSegment,
  IssueEvent,
  KpiData,
  ReportParams,
} from '../../jira/types';

/** Code.gs `normalizeTeamIdentity_` */
function normalizeTeamIdentity_(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

/** Code.gs `parseDateStartOfDay_` */
function parseDateStartOfDay_(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Code.gs `parseDateEndOfDay_` */
function parseDateEndOfDay_(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Code.gs `parseJiraDateSafe_` */
function parseJiraDateSafe_(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Code.gs `isWeekend_` */
function isWeekend_(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Code.gs `startOfDay_` */
function startOfDay_(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** Code.gs `endOfDay_` */
function endOfDay_(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Code.gs `getWorkingDurationMs_` — local calendar days, weekends excluded. */
export function legacyGetWorkingDurationMs_(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
): number | null {
  const start = parseJiraDateSafe_(fromValue);
  const end = parseJiraDateSafe_(toValue);

  if (!start || !end) return null;
  if (end <= start) return 0;

  let total = 0;
  let cursor = new Date(start);

  while (cursor < end) {
    const dayStart = startOfDay_(cursor);
    const dayEnd = endOfDay_(cursor);
    void dayStart;

    const segmentStart = new Date(Math.max(cursor.getTime(), start.getTime()));
    const segmentEnd = new Date(Math.min(dayEnd.getTime(), end.getTime()));

    if (!isWeekend_(segmentStart) && segmentEnd > segmentStart) {
      total += segmentEnd.getTime() - segmentStart.getTime();
    }

    cursor = new Date(dayEnd.getTime() + 1);
  }

  return total;
}

/** Code.gs `isDateWithinRange_` — inclusive dateFrom 00:00 / dateTo 23:59:59.999 */
export function legacyIsDateWithinRange_(
  dateValue: string,
  params: { dateFrom?: string; dateTo?: string },
): boolean {
  const d = parseJiraDateSafe_(dateValue);
  if (!d) return false;

  const from = parseDateStartOfDay_(params?.dateFrom);
  const to = parseDateEndOfDay_(params?.dateTo);

  if (from && d < from) return false;
  if (to && d > to) return false;

  return true;
}

/** Code.gs `containsNormalized_` */
function containsNormalized_(value: string, needle: string): boolean {
  return normalizeTeamIdentity_(value).indexOf(normalizeTeamIdentity_(needle)) >= 0;
}

/** Code.gs `isTodoLike_` */
function isTodoLike_(value: string): boolean {
  const normalized = normalizeTeamIdentity_(value);
  return (
    normalized === 'todo' ||
    normalized === 'to do' ||
    normalized === 'backlog' ||
    normalized === 'open' ||
    normalized === 'selected for development'
  );
}

/** Code.gs `getStageRank_` */
function getStageRank_(statusValue: string): number {
  const status = normalizeTeamIdentity_(statusValue || '');

  if (
    status === 'todo' ||
    status === 'to do' ||
    status === 'open' ||
    status === 'backlog' ||
    status === 'selected for development'
  ) {
    return 1;
  }

  if (status.indexOf('in progress') >= 0 || status.indexOf('hold') >= 0 || status.indexOf('blocked') >= 0) {
    return 2;
  }

  if (status === 'review' || status.indexOf('in review') >= 0) {
    return 3;
  }

  if (
    status.indexOf('done') >= 0 ||
    status.indexOf('approved') >= 0 ||
    status.indexOf('published') >= 0 ||
    status.indexOf('closed') >= 0
  ) {
    return 4;
  }

  return 0;
}

/** Code.gs `isReverseTransition_` */
export function legacyIsReverseTransition_(fromValue: string, toValue: string): boolean {
  const fromRank = getStageRank_(fromValue);
  const toRank = getStageRank_(toValue);
  if (!fromRank || !toRank) return false;
  return toRank < fromRank;
}

/** Code.gs `isTodoToProgressTransition_` */
function isTodoToProgressTransition_(fromValue: string, toValue: string): boolean {
  return isTodoLike_(fromValue) && containsNormalized_(toValue, 'in progress');
}

/** Code.gs `isProgressToReviewTransition_` */
function isProgressToReviewTransition_(fromValue: string, toValue: string): boolean {
  return (
    containsNormalized_(fromValue, 'in progress') &&
    (containsNormalized_(toValue, 'in review') || normalizeTeamIdentity_(toValue) === 'review')
  );
}

/** Code.gs `isReviewToDoneTransition_` */
function isReviewToDoneTransition_(fromValue: string, toValue: string): boolean {
  return (
    (containsNormalized_(fromValue, 'in review') || normalizeTeamIdentity_(fromValue) === 'review') &&
    (containsNormalized_(toValue, 'done') || containsNormalized_(toValue, 'approved'))
  );
}

/** Code.gs `isProgressToHoldTransition_` */
function isProgressToHoldTransition_(fromValue: string, toValue: string): boolean {
  return (
    containsNormalized_(fromValue, 'in progress') &&
    (containsNormalized_(toValue, 'on hold') || containsNormalized_(toValue, 'blocked'))
  );
}

/**
 * Code.gs `getStatusEventsSorted_`
 * Uses `issue.rangeEvents || issue.events` (empty array is truthy).
 */
function getStatusEventsSorted_(issue: AuditIssue): IssueEvent[] {
  const source = issue.rangeEvents || issue.events || [];
  return source
    .filter((e) => e.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

/**
 * Code.gs `getCycleSegments_`
 * `params` is accepted but unused in the vendored function — date filtering
 * happens only via pre-truncated `rangeEvents`.
 */
export function legacyGetCycleSegments_(
  issue: AuditIssue,
  _params?: ReportParams,
): CycleSegment[] {
  const events = getStatusEventsSorted_(issue);
  const segments: CycleSegment[] = [];

  let cycleStarted = false;
  let cycleTodoStartedAt: string | null = null;
  let progressStartedAt: string | null = null;
  let reviewStartedAt: string | null = null;
  let cycleWentToReview = false;
  let cycleHasBackflow = false;

  events.forEach((e) => {
    if (e.eventType !== 'Status') return;

    if (e.isBackflow && !e.excludeFromEfficiencyBackflow) {
      cycleHasBackflow = true;
    }

    if (isTodoToProgressTransition_(e.fromValue, e.toValue)) {
      cycleStarted = true;
      cycleTodoStartedAt = e.changedAt;
      progressStartedAt = e.changedAt;
      reviewStartedAt = null;
      cycleWentToReview = false;
      cycleHasBackflow = false;
      return;
    }

    if (!cycleStarted) return;

    if (isProgressToReviewTransition_(e.fromValue, e.toValue)) {
      if (progressStartedAt) {
        const progressToReviewMs = legacyGetWorkingDurationMs_(progressStartedAt, e.changedAt);

        if (progressToReviewMs !== null && progressToReviewMs >= 0) {
          reviewStartedAt = e.changedAt;
          cycleWentToReview = true;

          segments.push({
            type: 'progress_to_review',
            ms: progressToReviewMs,
            startedAt: progressStartedAt,
            endedAt: e.changedAt,
            hasBackflow: cycleHasBackflow,
            cycleTodoStartedAt,
            isCompleteCycle: false,
          });
        }
      }

      progressStartedAt = null;
      return;
    }

    if (isProgressToHoldTransition_(e.fromValue, e.toValue)) {
      if (progressStartedAt) {
        const progressToHoldMs = legacyGetWorkingDurationMs_(progressStartedAt, e.changedAt);

        if (progressToHoldMs !== null && progressToHoldMs >= 0) {
          segments.push({
            type: 'progress_to_hold',
            ms: progressToHoldMs,
            startedAt: progressStartedAt,
            endedAt: e.changedAt,
            hasBackflow: cycleHasBackflow,
            cycleTodoStartedAt,
            isCompleteCycle: false,
          });
        }
      }

      progressStartedAt = null;
      return;
    }

    if (isReviewToDoneTransition_(e.fromValue, e.toValue)) {
      if (!cycleTodoStartedAt || !reviewStartedAt || !cycleWentToReview) {
        cycleStarted = false;
        cycleTodoStartedAt = null;
        progressStartedAt = null;
        reviewStartedAt = null;
        cycleWentToReview = false;
        cycleHasBackflow = false;
        return;
      }

      const reviewToDoneMs = legacyGetWorkingDurationMs_(reviewStartedAt, e.changedAt);
      const fullCycleMs = legacyGetWorkingDurationMs_(cycleTodoStartedAt, e.changedAt);

      segments.push({
        type: 'review_to_done',
        ms: reviewToDoneMs !== null && reviewToDoneMs >= 0 ? reviewToDoneMs : null,
        startedAt: reviewStartedAt,
        endedAt: e.changedAt,
        hasBackflow: cycleHasBackflow,
        cycleTodoStartedAt,
        cycleWentToProgress: true,
        cycleWentToReview: true,
        fullCycleMs: fullCycleMs !== null && fullCycleMs >= 0 ? fullCycleMs : null,
        isCompleteCycle: true,
      });

      cycleStarted = false;
      cycleTodoStartedAt = null;
      progressStartedAt = null;
      reviewStartedAt = null;
      cycleWentToReview = false;
      cycleHasBackflow = false;
    }
  });

  return segments;
}

/** Code.gs `buildCompletedCyclesFromSegments_` */
export function legacyBuildCompletedCyclesFromSegments_(
  segments: CycleSegment[],
): CompletedCycle[] {
  const cycles: CompletedCycle[] = [];
  let pendingProgressToReview: CycleSegment | null = null;
  let pendingProgressToHold: CycleSegment[] = [];

  (segments || []).forEach((segment) => {
    if (segment.type === 'progress_to_review') {
      pendingProgressToReview = segment;
      return;
    }

    if (segment.type === 'progress_to_hold') {
      pendingProgressToHold.push(segment);
      return;
    }

    if (segment.type === 'review_to_done' && segment.isCompleteCycle) {
      cycles.push({
        progressToReview: pendingProgressToReview,
        progressToHolds: pendingProgressToHold.slice(),
        reviewToDone: segment,
        hasBackflow: !!segment.hasBackflow,
        isFirstPass: !segment.hasBackflow,
      });

      pendingProgressToReview = null;
      pendingProgressToHold = [];
    }
  });

  return cycles;
}

/** Code.gs `averageMs_` */
function averageMs_(items: number[]): number | null {
  if (!items || !items.length) return null;
  const sum = items.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / items.length);
}

/** Code.gs `calculateEfficiencyIndex_` (35+35+30−20, clamp 0–100) */
export function legacyCalculateEfficiencyIndex_(data: {
  startedCount: number;
  completedCount: number;
  firstPassAcceptedCount: number;
  backflowCount: number;
  avgProgressToReviewMs: number | null;
  targetReviewDays: number;
}): number {
  const startedCount = Number(data.startedCount || 0);
  const completedCount = Number(data.completedCount || 0);
  const firstPassAcceptedCount = Number(data.firstPassAcceptedCount || 0);
  const backflowCount = Number(data.backflowCount || 0);
  const targetReviewDays = Number(data.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  if (startedCount <= 0 || completedCount <= 0) {
    return 0;
  }

  const completionRate = Math.min(1, completedCount / Math.max(startedCount, 1));
  const firstPassRate = Math.min(1, firstPassAcceptedCount / Math.max(completedCount, 1));
  const backflowRate = backflowCount / Math.max(completedCount, 1);

  const completionScore = Math.round(completionRate * 35);
  const firstPassScore = Math.round(firstPassRate * 35);

  let speedScore = 0;
  const progressToReviewHours =
    data.avgProgressToReviewMs !== null && data.avgProgressToReviewMs !== undefined
      ? data.avgProgressToReviewMs / 3600000
      : null;

  if (progressToReviewHours !== null) {
    if (progressToReviewHours <= targetReviewHours) {
      speedScore = 30;
    } else if (progressToReviewHours <= targetReviewHours + 24) {
      speedScore = 24;
    } else if (progressToReviewHours <= targetReviewHours + 48) {
      speedScore = 18;
    } else if (progressToReviewHours <= targetReviewHours + 96) {
      speedScore = 10;
    } else {
      speedScore = 0;
    }
  }

  const backflowPenalty = Math.min(20, Math.round(backflowRate * 20));
  const rawScore = completionScore + firstPassScore + speedScore - backflowPenalty;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/** Code.gs `buildKpiFromIssues_` — started/review/completed increment only on completed cycles. */
export function legacyBuildKpiFromIssues_(
  issues: AuditIssue[],
  _transitionStats: Record<string, number>,
  params: ReportParams,
): KpiData {
  const progressToReviewDurations: number[] = [];
  const reviewToDoneDurations: number[] = [];
  const progressToHoldDurations: number[] = [];
  const todoToApprovedDurations: number[] = [];

  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let firstPassAcceptedCount = 0;
  let holdCount = 0;
  let backflowCount = 0;

  (issues || []).forEach((issue) => {
    const segments = legacyGetCycleSegments_(issue, params);
    const completedCycles = legacyBuildCompletedCyclesFromSegments_(segments);

    segments.forEach((segment) => {
      if (segment.type === 'progress_to_hold') {
        holdCount++;
        if (segment.ms !== null && segment.ms >= 0) {
          progressToHoldDurations.push(segment.ms);
        }
      }
    });

    completedCycles.forEach((cycle) => {
      startedCount++;
      reviewSubmittedCount++;
      completedCount++;

      if (cycle.progressToReview && cycle.progressToReview.ms !== null && cycle.progressToReview.ms >= 0) {
        progressToReviewDurations.push(cycle.progressToReview.ms);
      }

      if (cycle.reviewToDone && cycle.reviewToDone.ms !== null && cycle.reviewToDone.ms >= 0) {
        reviewToDoneDurations.push(cycle.reviewToDone.ms);
      }

      const fullCycleMs = cycle.reviewToDone?.fullCycleMs;
      if (fullCycleMs !== null && fullCycleMs !== undefined && fullCycleMs >= 0) {
        todoToApprovedDurations.push(fullCycleMs);
      }

      if (cycle.isFirstPass) {
        firstPassAcceptedCount++;
      }

      if (cycle.hasBackflow) {
        backflowCount++;
      }
    });
  });

  const avgProgressToReviewMs = averageMs_(progressToReviewDurations);
  const avgReviewToDoneMs = averageMs_(reviewToDoneDurations);
  const avgProgressToHoldMs = averageMs_(progressToHoldDurations);
  const avgTodoToApprovedMs = averageMs_(todoToApprovedDurations);
  const targetReviewDays = Number(params?.targetReviewDays ? params.targetReviewDays : 3);

  return {
    startedCount,
    reviewSubmittedCount,
    completedCount,
    firstPassAcceptedCount,
    holdCount,
    backflowCount,
    avgProgressToReviewMs,
    avgReviewToDoneMs,
    avgProgressToHoldMs,
    avgTodoToApprovedMs,
    targetReviewDays,
    efficiencyIndex: legacyCalculateEfficiencyIndex_({
      startedCount,
      completedCount,
      firstPassAcceptedCount,
      backflowCount,
      avgProgressToReviewMs,
      targetReviewDays,
    }),
  };
}

/** Code.gs `flattenGroupedIssues_` — first occurrence of each issueKey wins. */
export function legacyFlattenGroupedIssues_(
  grouped: Record<string, { issues?: AuditIssue[] }>,
): AuditIssue[] {
  const seen: Record<string, boolean> = {};
  const out: AuditIssue[] = [];

  Object.keys(grouped).forEach((userKey) => {
    (grouped[userKey].issues || []).forEach((issue) => {
      if (!seen[issue.issueKey]) {
        seen[issue.issueKey] = true;
        out.push(issue);
      }
    });
  });

  return out;
}

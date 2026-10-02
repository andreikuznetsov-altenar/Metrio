import { getWorkingDurationMs } from './dates';
import {
  isProgressToHoldTransition,
  isProgressToReviewTransition,
  isReviewToDoneTransition,
  isTodoToProgressTransition,
} from './transitions';
import type { AuditIssue, CompletedCycle, CycleSegment, ReportParams } from './types';

/** Build cycle segments from full issue history (not range-truncated events). */
export function getCycleSegments(issue: AuditIssue, _params?: ReportParams): CycleSegment[] {
  const events = (issue.events || [])
    .filter((e) => e.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
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

    if (isTodoToProgressTransition(e.fromValue, e.toValue)) {
      cycleStarted = true;
      cycleTodoStartedAt = e.changedAt;
      progressStartedAt = e.changedAt;
      reviewStartedAt = null;
      cycleWentToReview = false;
      cycleHasBackflow = false;
      return;
    }

    if (!cycleStarted) return;

    if (isProgressToReviewTransition(e.fromValue, e.toValue)) {
      if (progressStartedAt) {
        const progressToReviewMs = getWorkingDurationMs(progressStartedAt, e.changedAt);

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

    if (isProgressToHoldTransition(e.fromValue, e.toValue)) {
      if (progressStartedAt) {
        const progressToHoldMs = getWorkingDurationMs(progressStartedAt, e.changedAt);

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

    if (isReviewToDoneTransition(e.fromValue, e.toValue)) {
      if (!cycleTodoStartedAt || !reviewStartedAt || !cycleWentToReview) {
        cycleStarted = false;
        cycleTodoStartedAt = null;
        progressStartedAt = null;
        reviewStartedAt = null;
        cycleWentToReview = false;
        cycleHasBackflow = false;
        return;
      }

      const reviewToDoneMs = getWorkingDurationMs(reviewStartedAt, e.changedAt);
      const fullCycleMs = getWorkingDurationMs(cycleTodoStartedAt, e.changedAt);

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

/** Port of legacy buildCompletedCyclesFromSegments_ */
export function buildCompletedCyclesFromSegments(segments: CycleSegment[]): CompletedCycle[] {
  const cycles: CompletedCycle[] = [];
  let pendingProgressToReview: CycleSegment | null = null;
  const pendingProgressToHold: CycleSegment[] = [];

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
      pendingProgressToHold.length = 0;
    }
  });

  return cycles;
}

import { buildCompletedCyclesFromSegments, getCycleSegments } from './cycles';
import {
  isCompletedCycleInReportingPeriod,
  isHoldSegmentInReportingPeriod,
} from './cycleKpi';
import type { AuditIssue, KpiData, ReportParams } from './types';

function averageMs(items: number[]): number | null {
  if (!items || !items.length) return null;
  const sum = items.reduce((acc, value) => acc + value, 0);
  return Math.round(sum / items.length);
}

/** Port of legacy calculateEfficiencyIndex_ */
export function calculateEfficiencyIndex(data: {
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

export function getEfficiencyStatus(score: number): string {
  const value = Number(score || 0);

  if (value >= 95) return 'Excellent';
  if (value >= 80) return 'Healthy';
  if (value >= 65) return 'Watch';
  if (value >= 50) return 'Risk';
  return 'Critical';
}

/** Port of legacy buildKpiFromIssues_ */
export function buildKpiFromIssues(
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
    const segments = getCycleSegments(issue, params);
    const completedCycles = buildCompletedCyclesFromSegments(segments).filter((cycle) =>
      isCompletedCycleInReportingPeriod(cycle, params),
    );

    segments.forEach((segment) => {
      if (!isHoldSegmentInReportingPeriod(segment, params)) return;
      holdCount++;
      if (segment.ms !== null && segment.ms >= 0) {
        progressToHoldDurations.push(segment.ms);
      }
    });

    completedCycles.forEach((cycle) => {
      startedCount++;
      reviewSubmittedCount++;
      completedCount++;

      if (
        cycle.progressToReview &&
        cycle.progressToReview.ms !== null &&
        cycle.progressToReview.ms >= 0
      ) {
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

  const avgProgressToReviewMs = averageMs(progressToReviewDurations);
  const avgReviewToDoneMs = averageMs(reviewToDoneDurations);
  const avgProgressToHoldMs = averageMs(progressToHoldDurations);
  const avgTodoToApprovedMs = averageMs(todoToApprovedDurations);

  const targetReviewDays = Number(params?.targetReviewDays ?? 3);

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
    efficiencyIndex: calculateEfficiencyIndex({
      startedCount,
      completedCount,
      firstPassAcceptedCount,
      backflowCount,
      avgProgressToReviewMs,
      targetReviewDays,
    }),
  };
}

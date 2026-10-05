import { buildWorkflowKpi } from '../workflows/buildWorkflowKpi';
import type { AuditIssue, KpiData, ReportParams } from './types';

/** Port of legacy calculateEfficiencyIndex_ */
export function getEfficiencyScoreBreakdown(data: {
  startedCount: number;
  completedCount: number;
  firstPassAcceptedCount: number;
  backflowCount: number;
  avgProgressToReviewMs: number | null;
  targetReviewDays: number;
}) {
  const startedCount = Number(data.startedCount || 0);
  const completedCount = Number(data.completedCount || 0);
  const firstPassAcceptedCount = Number(data.firstPassAcceptedCount || 0);
  const backflowCount = Number(data.backflowCount || 0);
  const targetReviewDays = Number(data.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  if (startedCount <= 0 || completedCount <= 0) {
    return {
      completionScore: 0,
      firstPassScore: 0,
      speedScore: 0,
      backflowPenalty: 0,
      total: 0,
      completionRate: 0,
      firstPassRate: 0,
      backflowRate: 0,
      progressToReviewHours: null as number | null,
      targetReviewHours,
    };
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
  const total = Math.max(0, Math.min(100, Math.round(completionScore + firstPassScore + speedScore - backflowPenalty)));

  return {
    completionScore,
    firstPassScore,
    speedScore,
    backflowPenalty,
    total,
    completionRate,
    firstPassRate,
    backflowRate,
    progressToReviewHours,
    targetReviewHours,
  };
}

export function calculateEfficiencyIndex(data: {
  startedCount: number;
  completedCount: number;
  firstPassAcceptedCount: number;
  backflowCount: number;
  avgProgressToReviewMs: number | null;
  targetReviewDays: number;
}): number {
  return getEfficiencyScoreBreakdown(data).total;
}

export function getEfficiencyStatus(score: number): string {
  const value = Number(score || 0);

  if (value >= 95) return 'Excellent';
  if (value >= 80) return 'Healthy';
  if (value >= 65) return 'Watch';
  if (value >= 50) return 'Risk';
  return 'Critical';
}

/** Port of legacy buildKpiFromIssues_ — workflow-profile aware. */
export function buildKpiFromIssues(
  issues: AuditIssue[],
  _transitionStats: Record<string, number>,
  params: ReportParams,
): KpiData {
  return buildWorkflowKpi(issues || [], params);
}

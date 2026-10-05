export interface WskinsEfficiencyInput {
  startedCount: number;
  reviewSubmittedCount: number;
  completedCount: number;
  backflowCount: number;
  avgProgressToReviewMs: number | null;
  targetReviewDays: number;
}

export interface WskinsEfficiencyBreakdown {
  baseScore: number;
  completionScore: number;
  speedScore: number;
  backflowPenalty: number;
  total: number;
  completionBase: number;
}

/** Port of WskinsAudit.gs `calculateWSkinsEfficiencyIndex_`. */
export function calculateWskinsEfficiencyIndex(
  data: WskinsEfficiencyInput,
): WskinsEfficiencyBreakdown {
  const startedCount = Number(data.startedCount || 0);
  const reviewSubmittedCount = Number(data.reviewSubmittedCount || 0);
  const completedCount = Number(data.completedCount || 0);
  const backflowCount = Number(data.backflowCount || 0);
  const targetReviewDays = Number(data.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  const hasActivity =
    startedCount > 0 || reviewSubmittedCount > 0 || completedCount > 0;

  const baseScore = 40;
  const completionBase = Math.max(startedCount, reviewSubmittedCount, 1);

  if (!hasActivity) {
    return {
      baseScore,
      completionScore: 0,
      speedScore: 0,
      backflowPenalty: 0,
      total: 0,
      completionBase,
    };
  }

  const completionRate = completedCount / completionBase;
  const completionScore = Math.min(45, Math.round(completionRate * 45));

  const progressToReviewHours =
    data.avgProgressToReviewMs !== null && data.avgProgressToReviewMs !== undefined
      ? data.avgProgressToReviewMs / 3600000
      : null;

  let speedScore = 10;
  if (progressToReviewHours !== null) {
    if (progressToReviewHours <= targetReviewHours) {
      speedScore = 20;
    } else if (progressToReviewHours <= targetReviewHours + 24) {
      speedScore = 17;
    } else if (progressToReviewHours <= targetReviewHours + 48) {
      speedScore = 13;
    } else if (progressToReviewHours <= targetReviewHours + 96) {
      speedScore = 9;
    } else {
      speedScore = 4;
    }
  }

  const backflowBase = Math.max(startedCount, 1);
  const backflowRate = backflowCount / backflowBase;
  const backflowPenalty = Math.min(35, Math.round(backflowRate * 20));

  const rawScore = baseScore + completionScore + speedScore - backflowPenalty;
  const total = Math.max(1, Math.min(100, Math.round(rawScore)));

  return {
    baseScore,
    completionScore,
    speedScore,
    backflowPenalty,
    total,
    completionBase,
  };
}

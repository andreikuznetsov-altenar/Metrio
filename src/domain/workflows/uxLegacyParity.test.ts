import { describe, expect, it } from 'vitest';
import { getEfficiencyScoreBreakdown } from '../jira/kpi';

/** Parity with legacy Code.gs calculateEfficiencyIndex_ weighting (35/35/30 − 20). */
describe('ux legacy efficiency parity', () => {
  it('matches Code.gs composite for representative inputs', () => {
    const breakdown = getEfficiencyScoreBreakdown({
      startedCount: 10,
      completedCount: 8,
      firstPassAcceptedCount: 6,
      backflowCount: 2,
      avgProgressToReviewMs: 2.5 * 24 * 3600000,
      targetReviewDays: 3,
    });

    expect(breakdown.completionScore).toBe(Math.round((8 / 10) * 35));
    expect(breakdown.firstPassScore).toBe(Math.round((6 / 8) * 35));
    expect(breakdown.speedScore).toBe(30);
    expect(breakdown.backflowPenalty).toBe(Math.min(20, Math.round((2 / 8) * 20)));
    expect(breakdown.total).toBe(
      breakdown.completionScore + breakdown.firstPassScore + breakdown.speedScore - breakdown.backflowPenalty,
    );
  });
});

import { describe, expect, it } from 'vitest';
import { calculateEfficiencyIndex, getEfficiencyStatus } from './efficiencyIndex';

// LEGACY / PARITY ONLY: the Efficiency Index is not a production KPI.
describe('calculateEfficiencyIndex', () => {
  it('returns 0 when no started or completed cycles', () => {
    expect(
      calculateEfficiencyIndex({
        startedCount: 0,
        completedCount: 0,
        firstPassAcceptedCount: 0,
        backflowCount: 0,
        avgProgressToReviewMs: null,
        targetReviewDays: 3,
      }),
    ).toBe(0);
  });

  it('matches legacy scoring bands for speed', () => {
    const targetReviewDays = 3;
    const targetMs = targetReviewDays * 24 * 3600000;

    const withinTarget = calculateEfficiencyIndex({
      startedCount: 10,
      completedCount: 10,
      firstPassAcceptedCount: 10,
      backflowCount: 0,
      avgProgressToReviewMs: targetMs - 1,
      targetReviewDays,
    });

    expect(withinTarget).toBeGreaterThanOrEqual(95);
  });
});

describe('getEfficiencyStatus', () => {
  it('maps thresholds from legacy', () => {
    expect(getEfficiencyStatus(96)).toBe('Excellent');
    expect(getEfficiencyStatus(85)).toBe('Healthy');
    expect(getEfficiencyStatus(70)).toBe('Watch');
    expect(getEfficiencyStatus(55)).toBe('Risk');
    expect(getEfficiencyStatus(40)).toBe('Critical');
  });
});

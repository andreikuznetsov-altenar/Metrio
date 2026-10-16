import { describe, expect, it } from 'vitest';
import { calculateWskinsEfficiencyIndex } from './wskinsEfficiency';

describe('calculateWskinsEfficiencyIndex', () => {
  it('returns zero when there is no activity (legacy hasActivity gate)', () => {
    const result = calculateWskinsEfficiencyIndex({
      startedCount: 0,
      reviewSubmittedCount: 0,
      completedCount: 0,
      backflowCount: 0,
      avgProgressToReviewMs: null,
      targetReviewDays: 3,
    });
    expect(result.total).toBe(0);
  });

  it('returns base-only score when started but nothing completed', () => {
    const result = calculateWskinsEfficiencyIndex({
      startedCount: 3,
      reviewSubmittedCount: 2,
      completedCount: 0,
      backflowCount: 0,
      avgProgressToReviewMs: null,
      targetReviewDays: 3,
    });
    expect(result.baseScore).toBe(40);
    expect(result.completionScore).toBe(0);
    expect(result.speedScore).toBe(10);
    expect(result.total).toBe(50);
    expect(result.completionBase).toBe(3);
  });

  it('matches WskinsAudit.gs completion, default speed, and backflow weighting', () => {
    const perfect = calculateWskinsEfficiencyIndex({
      startedCount: 5,
      reviewSubmittedCount: 5,
      completedCount: 5,
      backflowCount: 0,
      avgProgressToReviewMs: 2 * 24 * 3600000,
      targetReviewDays: 3,
    });
    expect(perfect.completionScore).toBe(45);
    expect(perfect.speedScore).toBe(20);
    expect(perfect.backflowPenalty).toBe(0);
    expect(perfect.total).toBe(100);

    const slow = calculateWskinsEfficiencyIndex({
      startedCount: 4,
      reviewSubmittedCount: 4,
      completedCount: 4,
      backflowCount: 0,
      avgProgressToReviewMs: (3 * 24 + 50) * 3600000,
      targetReviewDays: 3,
    });
    expect(slow.speedScore).toBe(9);

    const heavyBackflow = calculateWskinsEfficiencyIndex({
      startedCount: 2,
      reviewSubmittedCount: 3,
      completedCount: 2,
      backflowCount: 10,
      avgProgressToReviewMs: null,
      targetReviewDays: 3,
    });
    expect(heavyBackflow.completionBase).toBe(3);
    expect(heavyBackflow.backflowPenalty).toBe(35);
    expect(heavyBackflow.total).toBe(Math.max(1, 40 + 30 + 10 - 35));
  });
});

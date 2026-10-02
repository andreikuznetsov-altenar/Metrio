import { describe, expect, it } from 'vitest';
import { cycleNeedsNewRun, periodKeyForCadence } from './feedbackScheduling';
import type { FeedbackCycle } from './feedbackCycleTypes';

const baseCycle: FeedbackCycle = {
  id: 'c1',
  name: 'Pulse',
  type: 'pulse',
  status: 'active',
  cadence: { unit: 'monthly', timezone: 'local' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('feedbackScheduling', () => {
  it('builds monthly period key', () => {
    const key = periodKeyForCadence(
      { unit: 'monthly', timezone: 'local' },
      new Date(2026, 2, 15),
    );
    expect(key).toBe('month-2026-03');
  });

  it('dedupes scheduled period', () => {
    const periodKey = `c1:${periodKeyForCadence(baseCycle.cadence!, new Date(2026, 2, 2))}`;
    const result = cycleNeedsNewRun(baseCycle, new Set([periodKey]), new Date(2026, 2, 2));
    expect(result?.needed).toBe(false);
  });

  it('requests new run when period missing', () => {
    const result = cycleNeedsNewRun(baseCycle, new Set(), new Date(2026, 2, 2));
    expect(result?.needed).toBe(true);
  });
});

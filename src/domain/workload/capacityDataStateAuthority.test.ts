import { describe, expect, it } from 'vitest';
import { capacityDataStateFromWorkload } from '../workload/capacityPresentation';
import { testWorkload } from '../testFixtures';

describe('capacityDataStateFromWorkload authority (UI11)', () => {
  it('prefers explicit insufficient_history on workload even if legacy counters exist', () => {
    const workload = testWorkload({
      level: 'low',
      capacityDataState: 'insufficient_history',
      capacityLoadPercent: 12,
      capacityBreakdown: {
        completedCycleHours: 0,
        activeSegmentHours: 4,
        avgHoursPerCycle: 4,
        completedCyclesInPeriod: 0,
        daysInPeriod: 30,
        monthlyQuantity: 0,
        estimatedMonthlyHours: 0,
        capacityLoadPercent: 12,
        capacityDataState: 'insufficient_history',
      },
    });
    expect(capacityDataStateFromWorkload(workload)).toBe('insufficient_history');
  });
});

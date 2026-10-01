import { describe, expect, it } from 'vitest';
import {
  getCurrentWeekRange,
  getISOWeekPeriodKey,
  getLocalDateKey,
  isTimestampInRange,
} from './dateRange';

describe('dateRange', () => {
  it('uses local calendar date key near UTC midnight', () => {
    const lateUtc = new Date('2026-01-01T23:30:00Z');
    const key = getLocalDateKey(lateUtc);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('defines current week from Monday local time', () => {
    const wednesday = new Date('2026-03-04T15:00:00');
    const range = getCurrentWeekRange(wednesday);
    expect(range.start.getDay()).toBe(1);
    expect(isTimestampInRange('2026-03-04T10:00:00', range)).toBe(true);
    expect(isTimestampInRange('2026-03-01T10:00:00', range)).toBe(false);
  });

  it('groups ISO weeks across year boundary', () => {
    expect(getISOWeekPeriodKey('2025-12-29T12:00:00')).toBe('2026-W01');
    expect(getISOWeekPeriodKey('2025-12-31T12:00:00')).toBe('2026-W01');
    expect(getISOWeekPeriodKey('2026-01-04T12:00:00')).toBe('2026-W01');
  });
});

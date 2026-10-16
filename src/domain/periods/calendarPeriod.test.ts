import { describe, expect, it } from 'vitest';
import { calendarPeriodDateKeys, previousCalendarPeriodDateKeys } from './calendarPeriod';
import { currentPeriod, previousPeriod } from '../trends/trendEngine';

// Explicit UTC instants: reporting dates are computed in Europe/Malta (UTC+1 in
// February), never in the host timezone.
describe('calendarPeriod', () => {
  it('returns exactly 28 local calendar dates including today', () => {
    const now = new Date('2026-02-20T17:00:00Z');
    const keys = calendarPeriodDateKeys(28, now);
    expect(keys).toHaveLength(28);
    expect(keys[keys.length - 1]).toBe('2026-02-20');
    expect(keys[0]).toBe('2026-01-24');
  });

  it('selects identical period keys regardless of time of day', () => {
    const morning = new Date('2026-02-20T07:00:00Z');
    const evening = new Date('2026-02-20T17:00:00Z');
    expect(calendarPeriodDateKeys(28, morning)).toEqual(calendarPeriodDateKeys(28, evening));
    expect(previousCalendarPeriodDateKeys(28, morning)).toEqual(
      previousCalendarPeriodDateKeys(28, evening),
    );
  });

  it('filters trend points by calendar keys not rolling hours', () => {
    const points = [
      { date: '2026-02-20', value: 1 },
      { date: '2026-01-24', value: 2 },
      { date: '2026-01-23', value: 99 },
    ];
    const now = new Date('2026-02-20T07:00:00Z');
    const current = currentPeriod(points, 28, now);
    const previous = previousPeriod(points, 28, now);
    expect(current.map((p) => p.date).sort()).toEqual(['2026-01-24', '2026-02-20']);
    expect(previous.map((p) => p.date).sort()).toEqual(['2026-01-23']);
  });

  it('returns no dates for a non-positive span instead of throwing', () => {
    const now = new Date('2026-02-20T17:00:00Z');
    expect(calendarPeriodDateKeys(-3, now)).toEqual([]);
    expect(previousCalendarPeriodDateKeys(-3, now)).toEqual([]);
    expect(previousCalendarPeriodDateKeys(0, now)).toEqual([]);
    expect(calendarPeriodDateKeys(7, new Date('invalid'))).toEqual([]);
  });
});

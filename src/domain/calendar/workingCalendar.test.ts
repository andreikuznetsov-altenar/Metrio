import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKING_CALENDAR,
  WorkingCalendar,
  zonedDateTimeToInstant,
} from './workingCalendar';

const HOUR = 3600000;

function at(key: string, hour: number): Date {
  return zonedDateTimeToInstant(key, hour, 'Europe/Malta')!;
}

describe('WorkingCalendar', () => {
  it('clips before and after the 09:00–17:00 business window', () => {
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(at('2026-01-05', 7), at('2026-01-05', 19))).toBe(8 * HOUR);
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(at('2026-01-05', 7), at('2026-01-05', 10))).toBe(HOUR);
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(at('2026-01-05', 16), at('2026-01-05', 20))).toBe(HOUR);
  });

  it('excludes weekends and clips overnight intervals', () => {
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(at('2026-01-09', 16), at('2026-01-12', 10))).toBe(2 * HOUR);
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(at('2026-01-10', 9), at('2026-01-11', 17))).toBe(0);
  });

  it('is stable across the Europe/Malta DST boundary', () => {
    const start = at('2026-03-27', 16);
    const end = at('2026-03-30', 10);
    expect(end.getTime() - start.getTime()).toBe(65 * HOUR);
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(start, end)).toBe(2 * HOUR);
  });

  it('never returns a negative duration', () => {
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(at('2026-01-05', 12), at('2026-01-05', 10))).toBe(0);
  });

  it('reduces availability for leave and supplied company holidays', () => {
    const calendar = new WorkingCalendar({ holidays: new Set(['2026-01-06']) });
    expect(calendar.availableWorkingHours('2026-01-05', '2026-01-09')).toBe(32);
    expect(calendar.availableWorkingHours('2026-01-05', '2026-01-09', [
      { start: '2026-01-07', end: '2026-01-08' },
    ])).toBe(16);
  });

  it('supports explicit part-time scheduled hours', () => {
    const calendar = new WorkingCalendar({
      scheduledHoursByDate: { '2026-01-05': 4 },
    });
    expect(calendar.availableWorkingHours('2026-01-05', '2026-01-05')).toBe(4);
  });

  it('resolves the same wall-clock times to the same absolute instants regardless of host timezone', () => {
    // Absolute expectations: they would differ if the host TZ leaked in.
    expect(at('2026-01-05', 9).toISOString()).toBe('2026-01-05T08:00:00.000Z'); // CET, UTC+1
    expect(at('2026-07-06', 9).toISOString()).toBe('2026-07-06T07:00:00.000Z'); // CEST, UTC+2
    const newYork = new WorkingCalendar({ timeZone: 'America/New_York' });
    expect(zonedDateTimeToInstant('2026-01-05', 9, 'America/New_York')!.toISOString()).toBe('2026-01-05T14:00:00.000Z');
    expect(newYork.dateKey('2026-01-06T04:30:00Z')).toBe('2026-01-05');
    expect(DEFAULT_WORKING_CALENDAR.dateKey('2026-01-05T23:30:00Z')).toBe('2026-01-06');
  });

  it('measures the same business window in a different explicit calendar timezone', () => {
    const newYork = new WorkingCalendar({ timeZone: 'America/New_York' });
    // 09:00–17:00 New York on Monday 2026-01-05 is 14:00Z–22:00Z.
    expect(newYork.businessTimeOverlapMs('2026-01-05T14:00:00Z', '2026-01-05T22:00:00Z')).toBe(8 * HOUR);
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs('2026-01-05T14:00:00Z', '2026-01-05T22:00:00Z')).toBe(2 * HOUR);
  });

  it('is stable across the America/New_York DST boundary', () => {
    const newYork = new WorkingCalendar({ timeZone: 'America/New_York' });
    const start = zonedDateTimeToInstant('2026-03-06', 16, 'America/New_York')!;
    const end = zonedDateTimeToInstant('2026-03-09', 10, 'America/New_York')!;
    expect(end.getTime() - start.getTime()).toBe(65 * HOUR); // 66 wall hours minus the skipped hour
    expect(newYork.businessTimeOverlapMs(start, end)).toBe(2 * HOUR);
  });

  it('counts the real working days in a partial reporting month', () => {
    // Thu 15 Jan – Fri 30 Jan 2026: 2 + 5 + 5 weekdays.
    expect(DEFAULT_WORKING_CALENDAR.availableWorkingHours('2026-01-15', '2026-01-31')).toBe(96);
    // A weekend-only range has no capacity and a full week has 40 hours, not a fixed 164.
    expect(DEFAULT_WORKING_CALENDAR.availableWorkingHours('2026-01-10', '2026-01-11')).toBe(0);
    expect(DEFAULT_WORKING_CALENDAR.availableWorkingHours('2026-01-05', '2026-01-09')).toBe(40);
  });

  it('measures a full same-day 09:00–17:00 window as eight hours', () => {
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(at('2026-01-05', 9), at('2026-01-05', 17))).toBe(8 * HOUR);
  });

  it('keeps weekday elapsed latency separate from business-window time', () => {
    const start = at('2026-01-05', 9);
    const end = at('2026-01-08', 9);
    expect(DEFAULT_WORKING_CALENDAR.weekdayElapsedMs(start, end)).toBe(72 * HOUR);
    expect(DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(start, end)).toBe(24 * HOUR);
  });
});

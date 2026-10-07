import { describe, expect, it } from 'vitest';
import { getWorkingDurationMs, getWorkingDurationMsWithinRange, formatDuration } from './dates';

describe('getWorkingDurationMs', () => {
  it('excludes weekends between two weekdays', () => {
    // Friday 10:00 to Monday 10:00 — only Fri 10-24 + Mon 0-10 working hours
    const ms = getWorkingDurationMs(
      '2024-01-05T10:00:00.000Z',
      '2024-01-08T10:00:00.000Z',
    );
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThan(0);
    // Should be less than full calendar 72h
    expect(ms!).toBeLessThan(72 * 60 * 60 * 1000);
  });

  it('returns 0 when end before start', () => {
    expect(getWorkingDurationMs('2024-01-10T12:00:00.000Z', '2024-01-10T10:00:00.000Z')).toBe(0);
  });
});

describe('getWorkingDurationMsWithinRange', () => {
  it('clips pre-period execution out of the report window', () => {
    const full = getWorkingDurationMs(
      '2023-01-02T09:00:00.000Z',
      '2026-01-07T09:00:00.000Z',
    );
    const clipped = getWorkingDurationMsWithinRange(
      '2023-01-02T09:00:00.000Z',
      '2026-01-07T09:00:00.000Z',
      { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
    );
    expect(full).toBeGreaterThan(clipped ?? 0);
    expect(clipped).toBeGreaterThan(0);
    expect(clipped!).toBeLessThan(24 * 8 * 3600000);
  });
});

describe('formatDuration', () => {
  it('formats minutes when under a day', () => {
    expect(formatDuration(90 * 60000)).toBe('1h 30m');
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  getWorkingDurationMs,
  getWorkingDurationMsWithinRange,
  WORKDAY_HOURS,
} from './dates';

const HOUR = 60 * 60 * 1000;

describe('getWorkingDurationMs', () => {
  it('counts only the 09:00–17:00 weekday window', () => {
    const ms = getWorkingDurationMs(
      '2024-01-05T10:00:00',
      '2024-01-08T10:00:00',
    );
    // Friday 10–17 = 7h, weekend = 0h, Monday 09–10 = 1h.
    expect(ms).toBe(8 * HOUR);
  });

  it('does not count overnight time outside business hours', () => {
    expect(
      getWorkingDurationMs(
        '2024-01-08T18:00:00',
        '2024-01-09T08:00:00',
      ),
    ).toBe(0);
  });

  it('caps five full weekdays at forty business hours instead of 120 elapsed hours', () => {
    const ms = getWorkingDurationMs(
      '2024-01-08T09:00:00',
      '2024-01-12T17:00:00',
    );
    expect(ms).toBe(5 * WORKDAY_HOURS * HOUR);
    expect(ms).toBe(40 * HOUR);
  });

  it('returns 0 when end is before start', () => {
    expect(
      getWorkingDurationMs(
        '2024-01-10T12:00:00',
        '2024-01-10T10:00:00',
      ),
    ).toBe(0);
  });
});

describe('getWorkingDurationMsWithinRange', () => {
  it('clips pre-period execution out of the report window', () => {
    const full = getWorkingDurationMs(
      '2023-01-02T09:00:00',
      '2026-01-07T17:00:00',
    );
    const clipped = getWorkingDurationMsWithinRange(
      '2023-01-02T09:00:00',
      '2026-01-07T17:00:00',
      { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
    );

    expect(full).toBeGreaterThan(clipped ?? 0);
    expect(clipped).toBe(40 * HOUR);
  });
});

describe('formatDuration', () => {
  it('formats minutes when under a day', () => {
    expect(formatDuration(90 * 60000)).toBe('1h 30m');
  });
});

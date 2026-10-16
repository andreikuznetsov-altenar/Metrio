import { describe, expect, it } from 'vitest';
import {
  formatBusinessDuration,
  formatDuration,
  getBusinessDurationMs,
  getWorkingDurationMs,
  getWorkingDurationMsWithinRange,
  WORKDAY_HOURS,
} from './dates';

const HOUR = 60 * 60 * 1000;

describe('getWorkingDurationMs', () => {
  it('preserves legacy elapsed-weekday semantics for cycle KPIs', () => {
    const ms = getWorkingDurationMs(
      '2024-01-05T10:00:00',
      '2024-01-08T10:00:00',
    );
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThan(23 * HOUR);
    expect(ms!).toBeLessThanOrEqual(24 * HOUR);
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

describe('getBusinessDurationMs', () => {
  it('counts only the 09:00–17:00 weekday window', () => {
    const ms = getBusinessDurationMs(
      '2024-01-05T10:00:00',
      '2024-01-08T10:00:00',
    );
    // Friday 10–17 = 7h, weekend = 0h, Monday 09–10 = 1h.
    expect(ms).toBe(8 * HOUR);
  });

  it('does not count overnight time outside business hours', () => {
    expect(
      getBusinessDurationMs(
        '2024-01-08T18:00:00',
        '2024-01-09T08:00:00',
      ),
    ).toBe(0);
  });

  it('caps five full weekdays at forty business hours instead of 120 elapsed hours', () => {
    const ms = getBusinessDurationMs(
      '2024-01-08T09:00:00',
      '2024-01-12T17:00:00',
    );
    expect(ms).toBe(5 * WORKDAY_HOURS * HOUR);
    expect(ms).toBe(40 * HOUR);
  });
});

describe('formatBusinessDuration', () => {
  it('does not present three business days as 72 elapsed hours', () => {
    expect(formatBusinessDuration(24 * HOUR)).toBe('3 business days');
  });
});

describe('getWorkingDurationMsWithinRange', () => {
  it('clips pre-period execution out of the report window without changing legacy KPI semantics', () => {
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
    expect(clipped).toBeGreaterThan(0);
    expect(clipped!).toBeLessThan(24 * 8 * HOUR);
  });
});

describe('formatDuration', () => {
  it('formats minutes when under a day', () => {
    expect(formatDuration(90 * 60000)).toBe('1h 30m');
  });
});

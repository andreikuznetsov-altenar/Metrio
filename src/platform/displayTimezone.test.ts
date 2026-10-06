import { describe, expect, it } from 'vitest';
import {
  buildDisplayTimezoneOptions,
  formatCompactUtcOffset,
  isFractionalTimezone,
  resolveDisplayTimezone,
} from './displayTimezone';

describe('displayTimezone', () => {
  it('resolves system sentinel to runtime timezone', () => {
    expect(resolveDisplayTimezone('system')).toBeTruthy();
    expect(resolveDisplayTimezone(undefined)).toBeTruthy();
  });

  it('formats compact UTC offsets with a space after UTC', () => {
    const date = new Date('2026-01-15T12:00:00Z');
    expect(formatCompactUtcOffset(date, 'UTC')).toBe('UTC +0');
    expect(formatCompactUtcOffset(date, 'Europe/Malta')).toBe('UTC +1');
    expect(formatCompactUtcOffset(date, 'Asia/Kolkata')).toBe('UTC +5:30');
  });

  it('detects fractional-hour timezones', () => {
    const date = new Date('2026-01-15T12:00:00Z');
    expect(isFractionalTimezone('Asia/Kolkata', date)).toBe(true);
    expect(isFractionalTimezone('Europe/Malta', date)).toBe(false);
  });

  it(
    'keeps selected fractional timezone visible when hiding fractional options',
    () => {
    const date = new Date('2026-01-15T12:00:00Z');
    const options = buildDisplayTimezoneOptions({
      hideFractional: true,
      selectedTimezone: 'Asia/Kolkata',
      date,
    });
    expect(options.some((option) => option.value === 'Asia/Kolkata')).toBe(true);
    expect(options.some((option) => option.value === 'Asia/Colombo')).toBe(false);
  },
    20_000,
  );
});

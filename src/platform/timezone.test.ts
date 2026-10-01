/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatGeneratedTimestamp,
  formatTimezoneHeaderLabel,
  formatUtcOffset,
  getSystemTimezone,
} from './timezone';

describe('getSystemTimezone', () => {
  it('returns IANA timezone from Intl', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Europe/Malta',
    } as Intl.ResolvedDateTimeFormatOptions);
    expect(getSystemTimezone()).toBe('Europe/Malta');
  });
});

describe('formatUtcOffset', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats positive UTC offset', () => {
    const date = new Date('2026-03-25T12:00:00');
    expect(formatUtcOffset(date, 'Europe/Malta')).toMatch(/^UTC\+/);
  });

  it('formats negative UTC offset', () => {
    const date = new Date('2026-01-15T12:00:00');
    expect(formatUtcOffset(date, 'America/New_York')).toMatch(/^UTC-/);
  });

  it('formats fractional UTC offset', () => {
    const date = new Date('2026-03-25T12:00:00');
    expect(formatUtcOffset(date, 'Asia/Kolkata')).toBe('UTC+5:30');
  });

  it('formats UTC as UTC+0', () => {
    const date = new Date('2026-03-25T12:00:00');
    expect(formatUtcOffset(date, 'UTC')).toBe('UTC+0');
  });
});

describe('formatTimezoneHeaderLabel', () => {
  it('combines IANA timezone and offset', () => {
    const date = new Date('2026-03-25T12:00:00');
    const label = formatTimezoneHeaderLabel(date, 'Europe/Malta');
    expect(label).toContain('Europe/Malta');
    expect(label).toContain('UTC');
  });
});

describe('formatGeneratedTimestamp', () => {
  it('formats local date/time without seconds', () => {
    const date = new Date(2026, 8, 25, 12, 53, 44);
    expect(formatGeneratedTimestamp(date)).toBe('25/09/2026 12:53');
  });
});

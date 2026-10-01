import { formatUtcOffset, getSystemTimezone } from './timezone';

export const DISPLAY_TIMEZONE_SYSTEM = 'system';

export interface DisplayTimezoneOption {
  value: string;
  label: string;
}

export function resolveDisplayTimezone(displayTimezone: string | undefined): string {
  if (!displayTimezone || displayTimezone === DISPLAY_TIMEZONE_SYSTEM) {
    return getSystemTimezone();
  }
  return displayTimezone;
}

export function formatCompactUtcOffset(date = new Date(), timeZone = getSystemTimezone()): string {
  const raw = formatUtcOffset(date, timeZone);
  return raw.replace(/^UTC([+-])/, 'UTC $1');
}

export function getTimezoneOffsetMinutes(timeZone: string, date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const raw = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = match[3] ? Number(match[3]) : 0;
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

export function isFractionalTimezone(timeZone: string, date = new Date()): boolean {
  const minutes = Math.abs(getTimezoneOffsetMinutes(timeZone, date));
  return minutes % 60 !== 0;
}

export function listSupportedTimezones(): string[] {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
    return intlWithSupportedValues.supportedValuesOf('timeZone');
  }
  return [
    'UTC',
    'Europe/London',
    'Europe/Malta',
    'Europe/Paris',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
}

export function buildDisplayTimezoneOptions({
  hideFractional,
  selectedTimezone,
  date = new Date(),
}: {
  hideFractional: boolean;
  selectedTimezone: string;
  date?: Date;
}): DisplayTimezoneOption[] {
  const resolvedSelected = resolveDisplayTimezone(selectedTimezone);
  const zones = listSupportedTimezones();

  const options = zones
    .filter((zone) => {
      if (!hideFractional) return true;
      if (zone === resolvedSelected) return true;
      return !isFractionalTimezone(zone, date);
    })
    .map((zone) => ({
      value: zone,
      label: formatCompactUtcOffset(date, zone),
    }));

  if (resolvedSelected && !options.some((option) => option.value === resolvedSelected)) {
    options.push({
      value: resolvedSelected,
      label: formatCompactUtcOffset(date, resolvedSelected),
    });
  }

  return options.sort((a, b) => {
    const offsetDiff =
      getTimezoneOffsetMinutes(a.value, date) - getTimezoneOffsetMinutes(b.value, date);
    if (offsetDiff !== 0) return offsetDiff;
    return a.label.localeCompare(b.label);
  });
}

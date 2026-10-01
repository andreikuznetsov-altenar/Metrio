export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatUtcOffset(date = new Date(), timeZone = getSystemTimezone()): string {
  if (timeZone === 'UTC') return 'UTC+0';

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const raw = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) {
      if (raw === 'GMT' || raw === 'UTC') return 'UTC+0';
      return 'UTC+0';
    }
    const sign = match[1];
    const hours = Number(match[2]);
    const minutes = match[3] ? Number(match[3]) : 0;
    if (minutes === 0) return `UTC${sign}${hours}`;
    return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  } catch {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hours = Math.floor(abs / 60);
    const minutes = abs % 60;
    if (minutes === 0) return `UTC${sign}${hours}`;
    return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  }
}

export function formatTimezoneHeaderLabel(date = new Date(), timeZone = getSystemTimezone()): string {
  const zone = timeZone === 'UTC' ? 'UTC' : timeZone;
  return `${zone} · ${formatUtcOffset(date, timeZone)}`;
}

export function formatGeneratedTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

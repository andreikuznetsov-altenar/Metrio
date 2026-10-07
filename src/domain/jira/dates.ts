export function parseDateStartOfDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseDateEndOfDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseJiraDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Port of legacy getWorkingDurationMs_ — excludes weekends */
export function getWorkingDurationMs(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
): number | null {
  const start = parseJiraDateSafe(fromValue);
  const end = parseJiraDateSafe(toValue);

  if (!start || !end) return null;
  if (end <= start) return 0;

  let total = 0;
  let cursor = new Date(start);

  while (cursor < end) {
    const dayEnd = endOfDay(cursor);

    const segmentStart = new Date(Math.max(cursor.getTime(), start.getTime()));
    const segmentEnd = new Date(Math.min(dayEnd.getTime(), end.getTime()));

    if (!isWeekend(segmentStart) && segmentEnd > segmentStart) {
      total += segmentEnd.getTime() - segmentStart.getTime();
    }

    cursor = new Date(dayEnd.getTime() + 1);
  }

  return total;
}

/** Working duration of [from, to] overlapped with inclusive report dateFrom/dateTo. */
export function getWorkingDurationMsWithinRange(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
  params?: { dateFrom?: string; dateTo?: string },
): number | null {
  const start = parseJiraDateSafe(fromValue);
  const end = parseJiraDateSafe(toValue);
  if (!start || !end) return null;
  if (end <= start) return 0;

  const from = parseDateStartOfDay(params?.dateFrom);
  const to = parseDateEndOfDay(params?.dateTo);
  const clippedStart = from && start < from ? from : start;
  const clippedEnd = to && end > to ? to : end;
  if (clippedEnd <= clippedStart) return 0;
  return getWorkingDurationMs(clippedStart.toISOString(), clippedEnd.toISOString());
}

export function isDateWithinRange(
  dateValue: string,
  params: { dateFrom?: string; dateTo?: string },
): boolean {
  const d = parseJiraDateSafe(dateValue);
  if (!d) return false;

  const from = parseDateStartOfDay(params.dateFrom);
  const to = parseDateEndOfDay(params.dateTo);

  if (from && d < from) return false;
  if (to && d > to) return false;

  return true;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '';

  const totalMinutes = Math.floor(Number(ms) / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && (minutes || parts.length === 0)) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

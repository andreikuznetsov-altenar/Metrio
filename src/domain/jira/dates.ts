import { appNow } from "../../platform/appClock";

export const WORKDAY_START_HOUR = 9;
export const WORKDAY_END_HOUR = 17;
export const WORKDAY_HOURS = WORKDAY_END_HOUR - WORKDAY_START_HOUR;

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

function atLocalHour(date: Date, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
}

function nextDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
}

/**
 * Elapsed business time between two Jira timestamps.
 *
 * Metrio intentionally does not treat "time in status" as 24h/day effort.
 * Only weekdays inside the reporting workday (09:00–17:00 local time) count.
 * This is still elapsed business time, not a timesheet or a claim about actual
 * hands-on effort.
 */
export function getWorkingDurationMs(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
): number | null {
  const start = parseJiraDateSafe(fromValue);
  const end = parseJiraDateSafe(toValue);

  if (!start || !end) return null;
  if (end <= start) return 0;

  let total = 0;
  let day = startOfDay(start);

  while (day < end) {
    if (!isWeekend(day)) {
      const workStart = atLocalHour(day, WORKDAY_START_HOUR);
      const workEnd = atLocalHour(day, WORKDAY_END_HOUR);
      const segmentStart = new Date(Math.max(start.getTime(), workStart.getTime()));
      const segmentEnd = new Date(Math.min(end.getTime(), workEnd.getTime()));

      if (segmentEnd > segmentStart) {
        total += segmentEnd.getTime() - segmentStart.getTime();
      }
    }

    day = nextDayStart(day);
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
  const now = appNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

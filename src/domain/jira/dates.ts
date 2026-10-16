import { appNow } from "../../platform/appClock";
import {
  DEFAULT_REPORTING_TIME_ZONE,
  DEFAULT_WORKDAY_END_HOUR,
  DEFAULT_WORKDAY_HOURS,
  DEFAULT_WORKDAY_START_HOUR,
  DEFAULT_WORKING_CALENDAR,
  dateKeyInTimeZone,
  zonedDateTimeToInstant,
} from '../calendar/workingCalendar';

export const WORKDAY_START_HOUR = DEFAULT_WORKDAY_START_HOUR;
export const WORKDAY_END_HOUR = DEFAULT_WORKDAY_END_HOUR;
export const WORKDAY_HOURS = DEFAULT_WORKDAY_HOURS;
export const REPORTING_TIME_ZONE = DEFAULT_REPORTING_TIME_ZONE;

export function parseDateStartOfDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  return DEFAULT_WORKING_CALENDAR.startOfDate(value.slice(0, 10));
}

export function parseDateEndOfDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  return DEFAULT_WORKING_CALENDAR.endOfDate(value.slice(0, 10));
}

export function parseJiraDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Jira commonly returns an explicit offset. Test fixtures and some cached
  // legacy payloads omit it; interpret those wall-clock values in the reporting
  // timezone instead of inheriting the host OS timezone.
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
    if (match) {
      return zonedDateTimeToInstant(
        match[1],
        Number(match[2]),
        REPORTING_TIME_ZONE,
        Number(match[3]),
        Number(match[4] ?? 0),
        Number((match[5] ?? '0').padEnd(3, '0')),
      );
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isWeekend(date: Date): boolean {
  return !DEFAULT_WORKING_CALENDAR.isWorkingDay(dateKeyInTimeZone(date));
}

export function startOfDay(date: Date): Date {
  return DEFAULT_WORKING_CALENDAR.startOfDate(dateKeyInTimeZone(date)) ?? new Date(date);
}

export function endOfDay(date: Date): Date {
  return DEFAULT_WORKING_CALENDAR.endOfDate(dateKeyInTimeZone(date)) ?? new Date(date);
}

/** Weekday elapsed workflow latency. Counts full local weekdays, not working hours. */
export function getWeekdayElapsedDurationMs(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
): number | null {
  const start = parseJiraDateSafe(fromValue);
  const end = parseJiraDateSafe(toValue);

  if (!start || !end) return null;
  if (end <= start) return 0;

  return DEFAULT_WORKING_CALENDAR.weekdayElapsedMs(start, end);
}

/** @deprecated Use getWeekdayElapsedDurationMs for explicit latency semantics. */
export function getWorkingDurationMs(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
): number | null {
  return getWeekdayElapsedDurationMs(fromValue, toValue);
}

/**
 * Elapsed business time for workload/capacity accounting.
 *
 * This deliberately differs from getWorkingDurationMs(): capacity must not turn
 * five weekdays in a Jira status into 120 hours. Only Mon–Fri 09:00–17:00 local
 * time counts. It is still elapsed business time, not a timesheet or proof of
 * hands-on effort.
 */
export function getBusinessWindowDurationMs(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
): number | null {
  const start = parseJiraDateSafe(fromValue);
  const end = parseJiraDateSafe(toValue);

  if (!start || !end) return null;
  if (end <= start) return 0;

  return DEFAULT_WORKING_CALENDAR.businessTimeOverlapMs(start, end);
}

/** Compatibility alias for the canonical business-window duration. */
export function getBusinessDurationMs(
  fromValue: string | null | undefined,
  toValue: string | null | undefined,
): number | null {
  return getBusinessWindowDurationMs(fromValue, toValue);
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
  return getWeekdayElapsedDurationMs(clippedStart.toISOString(), clippedEnd.toISOString());
}

/** Business-window duration of [from, to] clipped to an inclusive reporting range. */
export function getBusinessWindowDurationMsWithinRange(
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
  return getBusinessWindowDurationMs(clippedStart.toISOString(), clippedEnd.toISOString());
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

/**
 * Stage-age / workflow-latency label. These ages count whole Mon-Fri weekdays (24h each), NOT 8h
 * business days: say "weekdays" so they are never read as the business days used by Cycle,
 * Execution and Review Time.
 */
export function formatWeekdayCount(days: number): string {
  if (days <= 0) return '<1 weekday';
  return `${days} weekday${days === 1 ? '' : 's'}`;
}

/**
 * Weekday-elapsed duration (24h Mon-Fri days) e.g. "2 weekdays 3h". Use for stage ages and
 * per-issue workflow latency; business-window durations use formatBusinessDuration.
 */
export function formatWeekdayDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '';
  const totalMinutes = Math.floor(Number(ms) / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(formatWeekdayCount(days));
  if (hours) parts.push(`${hours}h`);
  if (!days && (minutes || parts.length === 0)) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/** Formats elapsed business-window time using the canonical eight-hour workday. */
export function formatBusinessDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '';

  const totalMinutes = Math.floor(Math.max(0, Number(ms)) / 60000);
  const businessDayMinutes = WORKDAY_HOURS * 60;
  const days = Math.floor(totalMinutes / businessDayMinutes);
  const hours = Math.floor((totalMinutes % businessDayMinutes) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days} business ${days === 1 ? 'day' : 'days'}`);
  if (hours) parts.push(`${hours}h`);
  if (!days && (minutes || parts.length === 0)) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/** Business days (WORKDAY_HOURS each) in a business-time duration. Never divide by 24h for these. */
export const MS_PER_BUSINESS_DAY = WORKDAY_HOURS * 60 * 60 * 1000;

export function businessMsToDays(ms: number): number {
  return ms / MS_PER_BUSINESS_DAY;
}

export function getTodayIsoDate(): string {
  return dateKeyInTimeZone(appNow());
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

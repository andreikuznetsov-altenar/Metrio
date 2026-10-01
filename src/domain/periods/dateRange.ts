import { endOfDay, getISOWeek, getISOWeekYear, parseISO, startOfMonth, startOfQuarter } from 'date-fns';
import { parseDateStartOfDay } from '../jira/dates';

export interface DateRange {
  start: Date;
  end: Date;
}

/** Local calendar date key (YYYY-MM-DD). */
export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday 00:00 local time through `now` (inclusive). */
export function getCurrentWeekRange(now = new Date()): DateRange {
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysFromMonday,
    0,
    0,
    0,
    0,
  );
  return { start, end: now };
}

export function getLastNDaysRange(days: number, now = new Date()): DateRange {
  const end = now;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

export function getLocalDayRangeFromKey(dateKey: string): DateRange {
  const start = parseDateStartOfDay(dateKey);
  if (!start) {
    const fallback = new Date();
    return { start: fallback, end: fallback };
  }
  return { start, end: endOfDay(start) };
}

export function isTimestampInRange(iso: string, range: DateRange): boolean {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return false;
  return ts >= range.start.getTime() && ts <= range.end.getTime();
}

export function getISOWeekPeriodKey(isoTimestamp: string): string {
  const d = parseISO(isoTimestamp);
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
}

export function getMonthPeriodKey(isoTimestamp: string): string {
  const d = parseISO(isoTimestamp);
  const month = startOfMonth(d);
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
}

export function getQuarterPeriodKey(isoTimestamp: string): string {
  const d = parseISO(isoTimestamp);
  const quarter = startOfQuarter(d);
  const q = Math.floor(quarter.getMonth() / 3) + 1;
  return `${quarter.getFullYear()}-Q${q}`;
}

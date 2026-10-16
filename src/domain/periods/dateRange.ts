import { parseDateStartOfDay } from '../jira/dates';
import {
  DEFAULT_WORKING_CALENDAR,
  addCalendarDays,
  dateKeyInTimeZone,
} from '../calendar/workingCalendar';

import { appNow } from "../../platform/appClock";
export interface DateRange {
  start: Date;
  end: Date;
}

/** Reporting-calendar date key (YYYY-MM-DD), independent of the host OS timezone. */
export function getLocalDateKey(date = appNow()): string {
  return dateKeyInTimeZone(date);
}

/** Monday 00:00 local time through `now` (inclusive). */
export function getCurrentWeekRange(now = appNow()): DateRange {
  const todayKey = getLocalDateKey(now);
  const [year, month, dayOfMonth] = todayKey.split('-').map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;
  const start = DEFAULT_WORKING_CALENDAR.startOfDate(addCalendarDays(todayKey, -daysFromMonday)) ?? now;
  return { start, end: now };
}

export function getLastNDaysRange(days: number, now = appNow()): DateRange {
  const end = now;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

export function getLocalDayRangeFromKey(dateKey: string): DateRange {
  const start = parseDateStartOfDay(dateKey);
  if (!start) {
    const fallback = appNow();
    return { start: fallback, end: fallback };
  }
  return { start, end: DEFAULT_WORKING_CALENDAR.endOfDate(dateKey) ?? start };
}

export function isTimestampInRange(iso: string, range: DateRange): boolean {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return false;
  return ts >= range.start.getTime() && ts <= range.end.getTime();
}

export function getISOWeekPeriodKey(isoTimestamp: string): string {
  const key = dateKeyInTimeZone(isoTimestamp);
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export function getMonthPeriodKey(isoTimestamp: string): string {
  return dateKeyInTimeZone(isoTimestamp).slice(0, 7);
}

export function getQuarterPeriodKey(isoTimestamp: string): string {
  const [year, month] = dateKeyInTimeZone(isoTimestamp).split('-').map(Number);
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

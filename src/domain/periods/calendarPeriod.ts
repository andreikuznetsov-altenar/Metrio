import { getLocalDateKey } from './dateRange';
import { addCalendarDays } from '../calendar/workingCalendar';

import { appNow } from "../../platform/appClock";
/** Inclusive local calendar date keys ending on `endDate` (exactly `days` dates). */
export function calendarPeriodDateKeys(days: number, endDate = appNow()): string[] {
  // Non-positive spans (e.g. a custom range whose end precedes its start) have no dates.
  if (!(days > 0) || Number.isNaN(endDate.getTime())) return [];
  const endKey = getLocalDateKey(endDate);
  return Array.from({ length: days }, (_, index) => addCalendarDays(endKey, index - days + 1));
}

/** The `days` local calendar dates immediately before the current period. */
export function previousCalendarPeriodDateKeys(days: number, endDate = appNow()): string[] {
  const current = calendarPeriodDateKeys(days, endDate);
  if (!current.length) return [];
  const endBeforeKey = addCalendarDays(current[0], -1);
  const endBefore = new Date(`${endBeforeKey}T12:00:00Z`);
  return calendarPeriodDateKeys(days, endBefore);
}

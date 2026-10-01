import { getLocalDateKey } from './dateRange';

/** Inclusive local calendar date keys ending on `endDate` (exactly `days` dates). */
export function calendarPeriodDateKeys(days: number, endDate = new Date()): string[] {
  const keys: string[] = [];
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(end);
    cursor.setDate(end.getDate() - offset);
    keys.push(getLocalDateKey(cursor));
  }
  return keys;
}

/** The `days` local calendar dates immediately before the current period. */
export function previousCalendarPeriodDateKeys(days: number, endDate = new Date()): string[] {
  const current = calendarPeriodDateKeys(days, endDate);
  const firstCurrent = new Date(`${current[0]}T12:00:00`);
  const endBefore = new Date(firstCurrent);
  endBefore.setDate(firstCurrent.getDate() - 1);
  return calendarPeriodDateKeys(days, endBefore);
}

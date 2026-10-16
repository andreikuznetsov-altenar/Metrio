import { dateKeyInTimeZone } from './workingCalendar';

import { appNow } from '../../platform/appClock';

/**
 * "Today" for operational, company-calendar facts (who is away, when leave starts, how many days
 * since a hire date): the reporting-calendar date, the same date trends, snapshots and capacity
 * use. It never depends on the host-OS time zone.
 */
export function reportingDateKey(now: Date = appNow()): string {
  return dateKeyInTimeZone(now);
}

/**
 * The reporting date as a host-local midnight `Date`. Date-only values parsed with `parseISO`
 * are host-local midnights too, so comparing the two is a pure calendar comparison that is
 * identical in every host zone.
 */
export function reportingDay(now: Date = appNow()): Date {
  const [year, month, day] = reportingDateKey(now).split('-').map(Number);
  return new Date(year, month - 1, day);
}

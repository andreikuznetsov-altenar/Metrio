import { addDays, format, parseISO, startOfDay } from 'date-fns';
import type { PersonAvailability } from '../../people/types';
import type { LeavePeriod } from './types';

/** Rolling planning horizon and base capacity of the current-workload model. */
export const HORIZON_WORKING_DAYS = 10;
export const HOURS_PER_WORKING_DAY = 8;

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/** The next `days` working days starting today (or the next weekday when today is a weekend). */
export function horizonWorkingDays(now: Date, days = HORIZON_WORKING_DAYS): Date[] {
  const out: Date[] = [];
  let cursor = startOfDay(now);
  while (out.length < days) {
    if (isWeekday(cursor)) out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

function ymd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Leave periods implied by the current availability (when it is a known absence). */
export function leavePeriodsFromAvailability(
  availability: PersonAvailability | undefined,
  horizon: Date[],
): LeavePeriod[] {
  if (!availability) return [];
  const away =
    availability.state === 'on_vacation' ||
    availability.state === 'returns_today' ||
    availability.isHoliday;
  if (!away) return [];
  const first = ymd(horizon[0]!);
  const last = ymd(horizon[horizon.length - 1]!);
  const start = (availability.startDate || first).slice(0, 10);
  // An absence without a known end is treated as covering the whole horizon.
  const end = (availability.endDate || last).slice(0, 10);
  return [{ start, end }];
}

export interface AvailableCapacity {
  hours: number;
  workingDays: number;
  leaveWorkingDays: number;
}

/** Base 8h x working days of the horizon, minus every working day covered by a leave period. */
export function availableHoursInHorizon(
  now: Date,
  leave: LeavePeriod[] = [],
  availability?: PersonAvailability,
  days = HORIZON_WORKING_DAYS,
): AvailableCapacity {
  const horizon = horizonWorkingDays(now, days);
  const periods = [...leave, ...leavePeriodsFromAvailability(availability, horizon)]
    .map((p) => ({ start: p.start.slice(0, 10), end: p.end.slice(0, 10) }))
    .filter((p) => !Number.isNaN(parseISO(p.start).getTime()) && !Number.isNaN(parseISO(p.end).getTime()));
  let leaveDays = 0;
  for (const day of horizon) {
    const key = ymd(day);
    if (periods.some((p) => key >= p.start && key <= p.end)) leaveDays += 1;
  }
  return {
    hours: (horizon.length - leaveDays) * HOURS_PER_WORKING_DAY,
    workingDays: horizon.length,
    leaveWorkingDays: leaveDays,
  };
}

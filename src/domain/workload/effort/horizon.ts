import type { PersonAvailability } from '../../people/types';
import type { LeavePeriod } from './types';
import {
  DEFAULT_WORKDAY_HOURS,
  DEFAULT_WORKING_CALENDAR,
  WorkingCalendar,
  addCalendarDays,
  zonedDateTimeToInstant,
} from '../../calendar/workingCalendar';

/** Rolling planning horizon and base capacity of the current-workload model. */
export const HORIZON_WORKING_DAYS = 10;
export const HOURS_PER_WORKING_DAY = DEFAULT_WORKDAY_HOURS;

/** The next `days` working days starting today (or the next weekday when today is a weekend). */
export function horizonWorkingDays(
  now: Date,
  days = HORIZON_WORKING_DAYS,
  calendar: WorkingCalendar = DEFAULT_WORKING_CALENDAR,
): Date[] {
  const out: Date[] = [];
  let key = calendar.dateKey(now);
  while (out.length < days) {
    if (calendar.isWorkingDay(key)) {
      const instant = zonedDateTimeToInstant(key, 12, calendar.config.timeZone);
      if (instant) out.push(instant);
    }
    key = addCalendarDays(key, 1);
  }
  return out;
}

function ymd(date: Date): string {
  return DEFAULT_WORKING_CALENDAR.dateKey(date);
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
  calendar: WorkingCalendar = DEFAULT_WORKING_CALENDAR,
): AvailableCapacity {
  const horizon = horizonWorkingDays(now, days, calendar);
  const periods = [...leave, ...leavePeriodsFromAvailability(availability, horizon)]
    .map((p) => ({ start: p.start.slice(0, 10), end: p.end.slice(0, 10) }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.start) && /^\d{4}-\d{2}-\d{2}$/.test(p.end));
  let leaveDays = 0;
  for (const day of horizon) {
    const key = ymd(day);
    if (periods.some((p) => key >= p.start && key <= p.end)) leaveDays += 1;
  }
  return {
    hours: horizon.reduce((sum, day) => {
      const key = calendar.dateKey(day);
      if (periods.some((p) => key >= p.start && key <= p.end)) return sum;
      return sum + calendar.workingHoursForDate(key);
    }, 0),
    workingDays: horizon.length,
    leaveWorkingDays: leaveDays,
  };
}

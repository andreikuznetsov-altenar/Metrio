import { addDays, format, isAfter, isBefore, isEqual, parseISO, startOfDay } from 'date-fns';
import type { PersonAvailability } from './types';
import { formatBambooTimeOffType } from './timeOffTypeLabel';

export interface TimeOffEntry {
  employeeId?: string;
  name?: string;
  type?: string;
  start?: string;
  end?: string;
  startDate?: string;
  endDate?: string;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  } catch {
    return null;
  }
}

function formatRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, 'MMM d')}–${format(end, 'd')}`;
  }
  return `${format(start, 'MMM d')}–${format(end, 'MMM d')}`;
}

export function classifyAvailability(
  entry: TimeOffEntry | null,
  today: Date = startOfDay(new Date()),
  soonWithinDays = 7,
): PersonAvailability {
  const day = startOfDay(today);

  if (!entry) {
    return { state: 'available', label: 'Available', isHoliday: false };
  }

  const type = String(entry.type || '').toLowerCase();
  const isHoliday = type.includes('holiday');

  const start = parseDate(entry.start || entry.startDate);
  const end = parseDate(entry.end || entry.endDate);

  if (!start || !end) {
    return { state: 'available', label: 'Available', isHoliday: false };
  }

  const returnDate = addDays(end, 1);

  if ((isBefore(start, day) || isEqual(start, day)) && (isAfter(end, day) || isEqual(end, day))) {
    const prefix = formatBambooTimeOffType(entry.type);
    return {
      state: 'on_vacation',
      label: `${prefix} · ${formatRange(start, end)}`,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      returnDate: format(returnDate, 'yyyy-MM-dd'),
      isHoliday,
    };
  }

  if (isEqual(returnDate, day)) {
    return {
      state: 'returns_today',
      label: 'Returns today',
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      returnDate: format(returnDate, 'yyyy-MM-dd'),
      isHoliday,
    };
  }

  const tomorrow = addDays(day, 1);
  if (isEqual(start, tomorrow)) {
    return {
      state: 'vacation_tomorrow',
      label: 'Vacation tomorrow',
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      returnDate: format(returnDate, 'yyyy-MM-dd'),
      isHoliday,
    };
  }

  const windowDays = Math.max(1, Math.min(21, Math.round(soonWithinDays)));
  const soonLimit = addDays(day, windowDays);
  if (isAfter(start, day) && !isAfter(start, soonLimit)) {
    const prefix = formatBambooTimeOffType(entry.type);
    return {
      state: 'vacation_soon',
      label: `${prefix} · ${formatRange(start, end)}`,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      returnDate: format(returnDate, 'yyyy-MM-dd'),
      isHoliday,
    };
  }

  return { state: 'available', label: 'Available', isHoliday: false };
}

export function pickRelevantTimeOff(
  entries: TimeOffEntry[],
  employeeId: string,
  today: Date = startOfDay(new Date()),
): TimeOffEntry | null {
  const mine = entries.filter((e) => String(e.employeeId || '') === String(employeeId));
  if (!mine.length) return null;

  const sorted = mine
    .map((e) => ({
      entry: e,
      start: parseDate(e.start || e.startDate),
      end: parseDate(e.end || e.endDate),
    }))
    .filter((x) => x.start && x.end)
    .sort((a, b) => a.start!.getTime() - b.start!.getTime());

  const active = sorted.find(
    (x) =>
      (isBefore(x.start!, today) || isEqual(x.start!, today)) &&
      (isAfter(x.end!, today) || isEqual(x.end!, today)),
  );
  if (active) return active.entry;

  const upcoming = sorted.find((x) => !isBefore(x.end!, today));
  return upcoming?.entry || null;
}

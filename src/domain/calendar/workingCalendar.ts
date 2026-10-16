export const DEFAULT_REPORTING_TIME_ZONE = 'Europe/Malta';
export const DEFAULT_WORKDAY_START_HOUR = 9;
export const DEFAULT_WORKDAY_END_HOUR = 17;
export const DEFAULT_WORKDAY_HOURS = DEFAULT_WORKDAY_END_HOUR - DEFAULT_WORKDAY_START_HOUR;

export interface CalendarDateRange {
  start: string;
  end: string;
}

export interface WorkingCalendarConfig {
  timeZone: string;
  workdayStartHour: number;
  workdayEndHour: number;
  /** ISO weekdays, Monday=1 through Sunday=7. */
  workingWeekdays: ReadonlySet<number>;
  /** Explicit company/public holiday date keys. Empty means holidays are not known. */
  holidays: ReadonlySet<string>;
  /** Optional per-date scheduled hours, including future part-time support. */
  scheduledHoursByDate?: Readonly<Record<string, number>>;
}

export const DEFAULT_WORKING_CALENDAR_CONFIG: WorkingCalendarConfig = {
  timeZone: DEFAULT_REPORTING_TIME_ZONE,
  workdayStartHour: DEFAULT_WORKDAY_START_HOUR,
  workdayEndHour: DEFAULT_WORKDAY_END_HOUR,
  workingWeekdays: new Set([1, 2, 3, 4, 5]),
  holidays: new Set(),
};

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, created);
  return created;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const values = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function parseDateKey(key: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) return null;
  return { year, month, day };
}

const instantCache = new Map<string, number>();
const INSTANT_CACHE_LIMIT = 20_000;

/** Convert a wall-clock time in an IANA timezone to its absolute instant. */
export function zonedDateTimeToInstant(
  dateKey: string,
  hour: number,
  timeZone = DEFAULT_REPORTING_TIME_ZONE,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  // Day/hour boundaries are requested repeatedly by duration accounting; memoizing
  // them removes the dominant Intl.DateTimeFormat cost without changing results.
  const cacheKey = `${timeZone}|${dateKey}|${hour}|${minute}|${second}|${millisecond}`;
  const cached = instantCache.get(cacheKey);
  if (cached !== undefined) return new Date(cached);
  const desired = Date.UTC(parsed.year, parsed.month - 1, parsed.day, hour, minute, second, millisecond);
  let candidate = desired;
  // Two iterations are normally enough; the third protects dates around offset changes.
  for (let index = 0; index < 3; index += 1) {
    const actual = zonedParts(new Date(candidate), timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      millisecond,
    );
    candidate += desired - represented;
  }
  if (instantCache.size >= INSTANT_CACHE_LIMIT) instantCache.clear();
  instantCache.set(cacheKey, candidate);
  return new Date(candidate);
}

const dateKeyCache = new Map<string, string>();
const DATE_KEY_CACHE_LIMIT = 50_000;

export function dateKeyInTimeZone(
  value: Date | string | number,
  timeZone = DEFAULT_REPORTING_TIME_ZONE,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  // An invalid instant has no calendar date; return a key that matches nothing
  // instead of throwing inside analytical pipelines.
  if (Number.isNaN(ms)) return '';
  // Every modern UTC offset is a multiple of 15 minutes, so the local calendar
  // date is constant inside a 15-minute UTC bucket. This keeps the lookup exact
  // while avoiding one Intl formatting call per timestamp.
  const bucketKey = `${timeZone}|${Math.floor(ms / 900_000)}`;
  const cached = dateKeyCache.get(bucketKey);
  if (cached) return cached;
  const parts = zonedParts(date, timeZone);
  const key = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  if (dateKeyCache.size >= DATE_KEY_CACHE_LIMIT) dateKeyCache.clear();
  dateKeyCache.set(bucketKey, key);
  return key;
}

export function addCalendarDays(dateKey: string, amount: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + amount));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function isoWeekday(dateKey: string): number {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return 7;
  const day = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function enumerateDateKeys(start: string, end: string): string[] {
  if (!parseDateKey(start) || !parseDateKey(end) || start > end) return [];
  const first = parseDateKey(start)!;
  const last = parseDateKey(end)!;
  const startUtc = Date.UTC(first.year, first.month - 1, first.day);
  const endUtc = Date.UTC(last.year, last.month - 1, last.day);
  const keys: string[] = [];
  for (let current = startUtc; current <= endUtc; current += 86_400_000) {
    const d = new Date(current);
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
    );
  }
  return keys;
}

export class WorkingCalendar {
  readonly config: WorkingCalendarConfig;

  constructor(config: Partial<WorkingCalendarConfig> = {}) {
    this.config = {
      ...DEFAULT_WORKING_CALENDAR_CONFIG,
      ...config,
      workingWeekdays: config.workingWeekdays ?? DEFAULT_WORKING_CALENDAR_CONFIG.workingWeekdays,
      holidays: config.holidays ?? DEFAULT_WORKING_CALENDAR_CONFIG.holidays,
    };
  }

  dateKey(value: Date | string | number): string {
    return dateKeyInTimeZone(value, this.config.timeZone);
  }

  isWorkingDay(dateKey: string): boolean {
    return this.config.workingWeekdays.has(isoWeekday(dateKey)) && !this.config.holidays.has(dateKey);
  }

  workingHoursForDate(dateKey: string): number {
    if (!this.isWorkingDay(dateKey)) return 0;
    const override = this.config.scheduledHoursByDate?.[dateKey];
    return Math.max(0, override ?? (this.config.workdayEndHour - this.config.workdayStartHour));
  }

  startOfDate(dateKey: string): Date | null {
    return zonedDateTimeToInstant(dateKey, 0, this.config.timeZone);
  }

  endOfDate(dateKey: string): Date | null {
    const next = this.startOfDate(addCalendarDays(dateKey, 1));
    return next ? new Date(next.getTime() - 1) : null;
  }

  businessTimeOverlapMs(from: Date | string, to: Date | string): number | null {
    const start = from instanceof Date ? from : new Date(from);
    const end = to instanceof Date ? to : new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (end <= start) return 0;
    let total = 0;
    for (const key of enumerateDateKeys(this.dateKey(start), this.dateKey(end))) {
      const scheduledHours = this.workingHoursForDate(key);
      if (scheduledHours <= 0) continue;
      const workStart = zonedDateTimeToInstant(
        key,
        this.config.workdayStartHour,
        this.config.timeZone,
      );
      const nominalEndHour = Math.min(
        this.config.workdayEndHour,
        this.config.workdayStartHour + scheduledHours,
      );
      const workEnd = zonedDateTimeToInstant(key, nominalEndHour, this.config.timeZone);
      if (!workStart || !workEnd) continue;
      const overlapStart = Math.max(start.getTime(), workStart.getTime());
      const overlapEnd = Math.min(end.getTime(), workEnd.getTime());
      if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
    }
    return total;
  }

  /** Weekday elapsed latency: full local weekday clock time, not working hours. */
  weekdayElapsedMs(from: Date | string, to: Date | string): number | null {
    const start = from instanceof Date ? from : new Date(from);
    const end = to instanceof Date ? to : new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (end <= start) return 0;
    let total = 0;
    for (const key of enumerateDateKeys(this.dateKey(start), this.dateKey(end))) {
      if (!this.config.workingWeekdays.has(isoWeekday(key))) continue;
      const dayStart = this.startOfDate(key);
      const nextStart = this.startOfDate(addCalendarDays(key, 1));
      if (!dayStart || !nextStart) continue;
      const overlapStart = Math.max(start.getTime(), dayStart.getTime());
      const overlapEnd = Math.min(end.getTime(), nextStart.getTime());
      if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
    }
    return total;
  }

  availableWorkingHours(
    startDateKey: string,
    endDateKey: string,
    unavailable: CalendarDateRange[] = [],
  ): number {
    const ranges = unavailable
      .map((range) => ({ start: range.start.slice(0, 10), end: range.end.slice(0, 10) }))
      .filter((range) => parseDateKey(range.start) && parseDateKey(range.end));
    return enumerateDateKeys(startDateKey, endDateKey).reduce((sum, key) => {
      if (ranges.some((range) => key >= range.start && key <= range.end)) return sum;
      return sum + this.workingHoursForDate(key);
    }, 0);
  }
}

export const DEFAULT_WORKING_CALENDAR = new WorkingCalendar();

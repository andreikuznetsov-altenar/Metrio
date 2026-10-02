import { addDays, differenceInCalendarDays, format, parseISO, startOfQuarter } from 'date-fns';
import type { DateRangeKey } from '../performance';
import { getLastNDaysRange } from '../periods/dateRange';

export type DateRangePreset = DateRangeKey | 'custom';

export interface PerformanceDateRange {
  from: string;
  to: string;
  preset: DateRangePreset;
}

export function presetToBounds(
  preset: Exclude<DateRangePreset, 'custom'>,
  now = new Date(),
): { from: string; to: string } {
  const dateTo = format(now, 'yyyy-MM-dd');
  if (preset === '7d') {
    const { start } = getLastNDaysRange(7, now);
    return { from: format(start, 'yyyy-MM-dd'), to: dateTo };
  }
  if (preset === '30d') {
    const { start } = getLastNDaysRange(30, now);
    return { from: format(start, 'yyyy-MM-dd'), to: dateTo };
  }
  const quarterStart = startOfQuarter(now);
  return { from: format(quarterStart, 'yyyy-MM-dd'), to: dateTo };
}

export function createPerformanceDateRange(
  preset: Exclude<DateRangePreset, 'custom'>,
  now = new Date(),
): PerformanceDateRange {
  const bounds = presetToBounds(preset, now);
  return { ...bounds, preset };
}

export function performanceDateRangeFromPresetKey(
  key: DateRangeKey,
  now = new Date(),
): PerformanceDateRange {
  return createPerformanceDateRange(key, now);
}

export function inclusiveRangeDayCount(from: string, to: string): number {
  const start = parseISO(from);
  const end = parseISO(to);
  return differenceInCalendarDays(end, start) + 1;
}

export function validatePerformanceDateRange(range: PerformanceDateRange): {
  valid: boolean;
  message: string | null;
} {
  if (!range.from || !range.to) {
    return { valid: false, message: 'Select both From and To dates.' };
  }
  if (range.from > range.to) {
    return { valid: false, message: 'From date must be on or before To date.' };
  }
  return { valid: true, message: null };
}

/** Immediately preceding range of equal inclusive length. */
export function previousComparableRange(range: PerformanceDateRange): PerformanceDateRange {
  const days = inclusiveRangeDayCount(range.from, range.to);
  const previousEnd = addDays(parseISO(range.from), -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return {
    from: format(previousStart, 'yyyy-MM-dd'),
    to: format(previousEnd, 'yyyy-MM-dd'),
    preset: 'custom',
  };
}

export function comparisonPeriodLabel(range: PerformanceDateRange): string {
  if (range.preset === '7d') return 'vs previous 7 days';
  if (range.preset === '30d') return 'vs previous 30 days';
  if (range.preset === 'quarter') return 'vs previous quarter';
  const prev = previousComparableRange(range);
  return `vs ${prev.from} – ${prev.to}`;
}

export function trendComparisonDayCount(range: PerformanceDateRange): number {
  if (range.preset === '7d') return 7;
  if (range.preset === '30d') return 30;
  if (range.preset === 'quarter') {
    return inclusiveRangeDayCount(range.from, range.to);
  }
  return inclusiveRangeDayCount(range.from, range.to);
}

export function dateRangeKeyFromPerformanceRange(
  range: PerformanceDateRange,
): DateRangeKey {
  if (range.preset === '7d' || range.preset === '30d' || range.preset === 'quarter') {
    return range.preset;
  }
  const days = inclusiveRangeDayCount(range.from, range.to);
  if (days <= 7) return '7d';
  if (days <= 31) return '30d';
  return 'quarter';
}

export const PERFORMANCE_DATE_RANGE_SESSION_KEY = 'metrio.performanceDateRange.v1';

export function readSessionPerformanceDateRange(
  now = new Date(),
): PerformanceDateRange {
  if (typeof sessionStorage === 'undefined') {
    return createPerformanceDateRange('30d', now);
  }
  try {
    const raw = sessionStorage.getItem(PERFORMANCE_DATE_RANGE_SESSION_KEY);
    if (!raw) return createPerformanceDateRange('30d', now);
    const parsed = JSON.parse(raw) as PerformanceDateRange;
    if (!parsed.from || !parsed.to) return createPerformanceDateRange('30d', now);
    return parsed;
  } catch {
    return createPerformanceDateRange('30d', now);
  }
}

export function writeSessionPerformanceDateRange(range: PerformanceDateRange): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PERFORMANCE_DATE_RANGE_SESSION_KEY, JSON.stringify(range));
}

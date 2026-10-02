import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  subMonths,
  subYears,
} from 'date-fns';
import type { DateRangeKey } from '../performance';
import { getLastNDaysRange } from '../periods/dateRange';

/** Legacy session values may still carry `quarter` from older builds. */
export type LegacyDateRangePreset = 'quarter';

export type DateRangePreset = DateRangeKey | 'custom' | LegacyDateRangePreset;

export interface PerformanceDateRange {
  from: string;
  to: string;
  preset: DateRangePreset;
}

export const DATE_RANGE_PRESET_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last year' },
];

export function isKnownDateRangePreset(
  preset: DateRangePreset,
): preset is DateRangeKey {
  return (
    preset === '7d' ||
    preset === '30d' ||
    preset === '3m' ||
    preset === '6m' ||
    preset === '1y'
  );
}

export function presetToBounds(
  preset: DateRangeKey,
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
  if (preset === '3m') {
    return { from: format(subMonths(now, 3), 'yyyy-MM-dd'), to: dateTo };
  }
  if (preset === '6m') {
    return { from: format(subMonths(now, 6), 'yyyy-MM-dd'), to: dateTo };
  }
  return { from: format(subYears(now, 1), 'yyyy-MM-dd'), to: dateTo };
}

export function createPerformanceDateRange(
  preset: DateRangeKey,
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
  if (range.preset === '3m') return 'vs previous 3 months';
  if (range.preset === '6m') return 'vs previous 6 months';
  if (range.preset === '1y') return 'vs previous year';
  const prev = previousComparableRange(range);
  return `vs ${format(parseISO(prev.from), 'd MMM')} – ${format(parseISO(prev.to), 'd MMM')}`;
}

/** Exact ISO comparison range for tooltips. */
export function comparisonPeriodExactLabel(range: PerformanceDateRange): string {
  if (isKnownDateRangePreset(range.preset)) {
    return comparisonPeriodLabel(range);
  }
  const prev = previousComparableRange(range);
  return `vs ${prev.from} – ${prev.to}`;
}

/** Unambiguous display for toolbar (value remains ISO yyyy-MM-dd in state). */
export function formatPerformanceDateDisplay(iso: string): string {
  if (!iso) return "";
  return format(parseISO(iso), "dd MMM yyyy");
}

export function trendComparisonDayCount(range: PerformanceDateRange): number {
  if (range.preset === '7d') return 7;
  if (range.preset === '30d') return 30;
  if (range.preset === '3m' || range.preset === '6m' || range.preset === '1y') {
    return inclusiveRangeDayCount(range.from, range.to);
  }
  return inclusiveRangeDayCount(range.from, range.to);
}

export function dateRangeKeyFromPerformanceRange(
  range: PerformanceDateRange,
): DateRangeKey {
  if (isKnownDateRangePreset(range.preset)) {
    return range.preset;
  }
  const days = inclusiveRangeDayCount(range.from, range.to);
  if (days <= 7) return '7d';
  if (days <= 31) return '30d';
  if (days <= 100) return '3m';
  if (days <= 200) return '6m';
  return '1y';
}

export function buildPerformanceDatasetKey(input: {
  dateRange: PerformanceDateRange;
  reviewTarget: string;
  audience: string;
  selfPersonId: string;
}): string {
  const { dateRange, reviewTarget, audience, selfPersonId } = input;
  return JSON.stringify({
    from: dateRange.from,
    to: dateRange.to,
    preset: dateRange.preset,
    reviewTarget,
    audience,
    selfPersonId,
  });
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

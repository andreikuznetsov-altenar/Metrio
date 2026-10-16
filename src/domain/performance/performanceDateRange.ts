import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from 'date-fns';
import type { DateRangeKey } from '../performance';
import { getLocalDateKey } from '../periods/dateRange';
import { addCalendarDays } from '../calendar/workingCalendar';

import { appNow } from "../../platform/appClock";
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

/** `dateKey` shifted by whole calendar months; a day past the target month's end clamps to its last day. */
function shiftDateKeyByMonths(dateKey: string, months: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Preset bounds on the canonical reporting calendar. "Today" is the reporting-calendar date of
 * `now` (the same date trends and snapshots use), never the host-OS date, so the selected range
 * and the trend windows agree in every host time zone.
 */
export function presetToBounds(
  preset: DateRangeKey,
  now = appNow(),
): { from: string; to: string } {
  const to = getLocalDateKey(now);
  if (preset === '7d') return { from: addCalendarDays(to, -7), to };
  if (preset === '30d') return { from: addCalendarDays(to, -30), to };
  if (preset === '3m') return { from: shiftDateKeyByMonths(to, -3), to };
  if (preset === '6m') return { from: shiftDateKeyByMonths(to, -6), to };
  return { from: shiftDateKeyByMonths(to, -12), to };
}

export function createPerformanceDateRange(
  preset: DateRangeKey,
  now = appNow(),
): PerformanceDateRange {
  const bounds = presetToBounds(preset, now);
  return { ...bounds, preset };
}

export function performanceDateRangeFromPresetKey(
  key: DateRangeKey,
  now = appNow(),
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
  return format(parseISO(iso), "d MMM yyyy");
}

/** Human range for toolbars and cards (ISO in state unchanged). */
export function formatPerformanceDateRangeDisplay(from: string, to: string): string {
  if (!from || !to) return "";
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${format(fromDate, "d")} – ${format(toDate, "d MMM yyyy")}`;
  }
  return `${format(fromDate, "d MMM")} – ${format(toDate, "d MMM yyyy")}`;
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

export const PERFORMANCE_DATE_RANGE_SESSION_KEY = 'metrio.performanceDateRange.v2';
const LEGACY_PERFORMANCE_DATE_RANGE_SESSION_KEY = 'metrio.performanceDateRange.v1';

function parsedSessionRange(raw: string | null): PerformanceDateRange | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as PerformanceDateRange;
  return parsed.from && parsed.to ? parsed : null;
}

export function readSessionPerformanceDateRange(
  now = appNow(),
): PerformanceDateRange {
  if (typeof sessionStorage === 'undefined') {
    return createPerformanceDateRange('3m', now);
  }
  try {
    const current = parsedSessionRange(
      sessionStorage.getItem(PERFORMANCE_DATE_RANGE_SESSION_KEY),
    );
    if (current) return current;

    const legacy = parsedSessionRange(
      sessionStorage.getItem(LEGACY_PERFORMANCE_DATE_RANGE_SESSION_KEY),
    );
    // v1 shipped with 30d as its implicit default, so that value cannot be
    // distinguished from an explicit selection. Other valid selections migrate.
    const migrated =
      legacy && legacy.preset !== '30d'
        ? legacy
        : createPerformanceDateRange('3m', now);
    sessionStorage.setItem(
      PERFORMANCE_DATE_RANGE_SESSION_KEY,
      JSON.stringify(migrated),
    );
    return migrated;
  } catch {
    return createPerformanceDateRange('3m', now);
  }
}

export function writeSessionPerformanceDateRange(range: PerformanceDateRange): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PERFORMANCE_DATE_RANGE_SESSION_KEY, JSON.stringify(range));
}

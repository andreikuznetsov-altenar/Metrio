import { subDays, subMonths, format, parseISO } from 'date-fns';
import { getTodayIsoDate } from '../jira/dates';
import {
  inclusiveRangeDayCount,
  previousComparableRange,
  type PerformanceDateRange,
} from '../performance/performanceDateRange';
import { WORK_HISTORY_WINDOW_DAYS } from './constants';

export interface RequiredComparisonCoverage {
  displayRange: PerformanceDateRange;
  comparisonRange: PerformanceDateRange;
  requiredFetchStart: string;
  requiredFetchEnd: string;
}

export function getDefaultReportDateFrom(dateTo: string): string {
  const end = parseISO(dateTo);
  return format(subMonths(end, 3), 'yyyy-MM-dd');
}

export function resolveEffectiveReportRange(filters: {
  dateFrom: string;
  dateTo: string;
}): { dateFrom: string; dateTo: string } {
  const dateTo = filters.dateTo || getTodayIsoDate();
  const dateFrom = filters.dateFrom || getDefaultReportDateFrom(dateTo);
  return { dateFrom, dateTo };
}

/** Canonical display/comparison/fetch coverage for Performance history. */
export function resolveRequiredComparisonCoverage(
  displayRange: PerformanceDateRange,
  now = new Date(),
): RequiredComparisonCoverage {
  const comparisonRange = previousComparableRange(displayRange);
  const workHistoryStart = format(
    subDays(parseISO(displayRange.to), WORK_HISTORY_WINDOW_DAYS - 1),
    'yyyy-MM-dd',
  );
  const today = format(now, 'yyyy-MM-dd');
  return {
    displayRange,
    comparisonRange,
    requiredFetchStart:
      comparisonRange.from < workHistoryStart ? comparisonRange.from : workHistoryStart,
    requiredFetchEnd: displayRange.to < today ? displayRange.to : today,
  };
}

/** Inclusive history span covering the display and equal preceding period. */
export function requiredHistoryDaySpan(reportDateFrom: string, dateTo: string): number {
  const coverage = resolveRequiredComparisonCoverage({
    from: reportDateFrom,
    to: dateTo,
    preset: 'custom',
  });
  return inclusiveRangeDayCount(coverage.requiredFetchStart, coverage.requiredFetchEnd);
}

export function getHistoryFetchDateFrom(dateTo: string, reportDateFrom?: string): string {
  const from = reportDateFrom || getDefaultReportDateFrom(dateTo);
  return resolveRequiredComparisonCoverage({
    from,
    to: dateTo,
    preset: 'custom',
  }).requiredFetchStart;
}

export function getEarliestFetchDate(reportDateFrom: string, dateTo: string): string {
  const historyFrom = getHistoryFetchDateFrom(dateTo, reportDateFrom);
  if (!reportDateFrom) return historyFrom;
  return reportDateFrom < historyFrom ? reportDateFrom : historyFrom;
}

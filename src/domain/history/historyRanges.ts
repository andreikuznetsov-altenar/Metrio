import { subDays, format, parseISO } from 'date-fns';
import { getTodayIsoDate } from '../jira/dates';
import { inclusiveRangeDayCount } from '../performance/performanceDateRange';
import {
  DEFAULT_REPORT_WINDOW_DAYS,
  HISTORICAL_BOOTSTRAP_DAYS,
  WORK_HISTORY_WINDOW_DAYS,
} from './constants';

export function getDefaultReportDateFrom(dateTo: string): string {
  const end = parseISO(dateTo);
  return format(subDays(end, DEFAULT_REPORT_WINDOW_DAYS - 1), 'yyyy-MM-dd');
}

export function resolveEffectiveReportRange(filters: {
  dateFrom: string;
  dateTo: string;
}): { dateFrom: string; dateTo: string } {
  const dateTo = filters.dateTo || getTodayIsoDate();
  const dateFrom = filters.dateFrom || getDefaultReportDateFrom(dateTo);
  return { dateFrom, dateTo };
}

/** Inclusive history span: current reporting window + prior comparison window. */
export function requiredHistoryDaySpan(reportDateFrom: string, dateTo: string): number {
  const current = inclusiveRangeDayCount(reportDateFrom, dateTo);
  return Math.max(current * 2, WORK_HISTORY_WINDOW_DAYS, HISTORICAL_BOOTSTRAP_DAYS);
}

export function getHistoryFetchDateFrom(dateTo: string, reportDateFrom?: string): string {
  const end = parseISO(dateTo);
  const spanDays = reportDateFrom
    ? requiredHistoryDaySpan(reportDateFrom, dateTo)
    : Math.max(DEFAULT_REPORT_WINDOW_DAYS * 2, WORK_HISTORY_WINDOW_DAYS, HISTORICAL_BOOTSTRAP_DAYS);
  return format(subDays(end, spanDays - 1), 'yyyy-MM-dd');
}

export function getEarliestFetchDate(reportDateFrom: string, dateTo: string): string {
  const historyFrom = getHistoryFetchDateFrom(dateTo, reportDateFrom);
  if (!reportDateFrom) return historyFrom;
  return reportDateFrom < historyFrom ? reportDateFrom : historyFrom;
}

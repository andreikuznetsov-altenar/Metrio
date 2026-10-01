import { subDays, format, parseISO } from 'date-fns';
import { getTodayIsoDate } from '../jira/dates';
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

export function getHistoryFetchDateFrom(dateTo: string): string {
  const end = parseISO(dateTo);
  const historyDays = Math.max(WORK_HISTORY_WINDOW_DAYS, HISTORICAL_BOOTSTRAP_DAYS);
  return format(subDays(end, historyDays - 1), 'yyyy-MM-dd');
}

export function getEarliestFetchDate(reportDateFrom: string, dateTo: string): string {
  const historyFrom = getHistoryFetchDateFrom(dateTo);
  if (!reportDateFrom) return historyFrom;
  return reportDateFrom < historyFrom ? reportDateFrom : historyFrom;
}

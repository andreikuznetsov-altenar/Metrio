import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { reportingDay } from "../calendar/reportingDay";

import { appNow } from "../../platform/appClock";
export const NEW_STARTER_DAYS = 60;

let configuredNewStarterDays = NEW_STARTER_DAYS;

export function configureNewStarterWindow(days: number): void {
  if (days >= 1 && days <= 120) {
    configuredNewStarterDays = days;
  }
}

export function getNewStarterWindowDays(): number {
  return configuredNewStarterDays;
}

export interface NewStarterProfile {
  hireDate: string;
  department?: string;
  jobTitle?: string;
}

export function isNewStarter(hireDate: string | undefined, today = appNow()): boolean {
  if (!hireDate) return false;
  const start = parseISO(hireDate.slice(0, 10));
  if (Number.isNaN(start.getTime())) return false;
  const days = differenceInCalendarDays(reportingDay(today), start);
  return days >= 0 && days < configuredNewStarterDays;
}

export function newStarterDayNumber(hireDate: string, today = appNow()): number {
  const start = parseISO(hireDate.slice(0, 10));
  return differenceInCalendarDays(reportingDay(today), start) + 1;
}

export function formatNewStarterHeadline(hireDate: string, today = appNow()): string {
  const day = newStarterDayNumber(hireDate, today);
  return `Getting started · Day ${day}`;
}

export function formatHireDateLabel(hireDate: string): string {
  return `Started ${format(parseISO(hireDate.slice(0, 10)), "d MMM yyyy")}`;
}

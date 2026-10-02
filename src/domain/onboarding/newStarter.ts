import { differenceInCalendarDays, format, parseISO } from "date-fns";

export const NEW_STARTER_DAYS = 60;

export interface NewStarterProfile {
  hireDate: string;
  department?: string;
  jobTitle?: string;
}

export function isNewStarter(hireDate: string | undefined, today = new Date()): boolean {
  if (!hireDate) return false;
  const start = parseISO(hireDate.slice(0, 10));
  if (Number.isNaN(start.getTime())) return false;
  const days = differenceInCalendarDays(today, start);
  return days >= 0 && days < NEW_STARTER_DAYS;
}

export function newStarterDayNumber(hireDate: string, today = new Date()): number {
  const start = parseISO(hireDate.slice(0, 10));
  return differenceInCalendarDays(today, start) + 1;
}

export function formatNewStarterHeadline(hireDate: string, today = new Date()): string {
  const day = newStarterDayNumber(hireDate, today);
  return `Getting started · Day ${day}`;
}

export function formatHireDateLabel(hireDate: string): string {
  return `Started ${format(parseISO(hireDate.slice(0, 10)), "d MMM yyyy")}`;
}

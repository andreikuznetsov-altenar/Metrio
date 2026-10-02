import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import type { PersonAvailability } from "../people/types";

export function parseCalendarDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = parseISO(iso.slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function calendarDaysUntil(startDateIso: string, today = new Date()): number | null {
  const start = parseCalendarDate(startDateIso);
  if (!start) return null;
  const day = startOfDay(today);
  return differenceInCalendarDays(start, day);
}

export function formatLeaveCountdown(startDateIso: string, today = new Date()): string {
  const days = calendarDaysUntil(startDateIso, today);
  if (days == null) return "Upcoming time off";
  if (days <= 0) return "starts today";
  if (days === 1) return "starts tomorrow";
  return `starts in ${days} days`;
}

export function formatLeaveRangeLabel(start?: string, end?: string): string | null {
  const s = start ? parseCalendarDate(start) : null;
  const e = end ? parseCalendarDate(end) : null;
  if (!s || !e) return null;
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${format(s, "d")}–${format(e, "d MMM")}`;
  }
  return `${format(s, "d MMM")}–${format(e, "d MMM")}`;
}

export function isUpcomingLeaveState(state: PersonAvailability["state"]): boolean {
  return (
    state === "vacation_soon" ||
    state === "vacation_tomorrow" ||
    state === "on_vacation"
  );
}

export function availabilityHeadline(
  availability: PersonAvailability,
  today = new Date(),
): string {
  if (availability.state === "on_vacation") {
    return "On time off";
  }
  if (availability.startDate) {
    const countdown = formatLeaveCountdown(availability.startDate, today);
    const range = formatLeaveRangeLabel(
      availability.startDate,
      availability.endDate,
    );
    return range ? `${range} · ${countdown}` : countdown;
  }
  return availability.label;
}

/**
 * ONE availability resolver. Every surface that names a person's leave state (Person drawer header,
 * People / team tables, dashboards) asks this module, so a header can never say "On leave" while the
 * availability card says "starts in 5 days".
 *
 * Phase is derived from Bamboo's authoritative leave DATES against `today` (the persisted `state` can
 * be stale between syncs); it falls back to `state` only when dates are missing.
 */
import { parseCalendarDate } from "./leaveCalendar";
import type { PersonAvailability } from "../people/types";

import { appNow } from "../../platform/appClock";
export type AvailabilityPhase = "available" | "upcoming" | "current" | "returning";
/** "vacation" only when Bamboo says the absence is a vacation; any other absence stays generic. */
export type LeaveKind = "vacation" | "leave";

export interface AvailabilityPresentation {
  phase: AvailabilityPhase;
  kind: LeaveKind | null;
  /** Short badge text: Available · Vacation soon / Leave soon · On leave · Returns today. */
  badgeLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Bamboo type is the label prefix ("Vacation · Oct 20–24"); fixtures may say "Vacation soon". */
function leaveKind(availability: PersonAvailability): LeaveKind {
  const head = availability.label.split("·")[0]?.trim().toLowerCase() ?? "";
  return head.startsWith("vacation") ? "vacation" : "leave";
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function resolveAvailabilityPresentation(
  availability: PersonAvailability,
  today: Date = appNow(),
): AvailabilityPresentation {
  const start = parseCalendarDate(availability.startDate);
  const end = parseCalendarDate(availability.endDate);
  const dayMs = startOfDayMs(today);

  let phase: AvailabilityPhase;
  if (start && end) {
    if (end.getTime() < dayMs - DAY_MS) phase = "available"; // ended before yesterday: past leave
    else if (end.getTime() === dayMs - DAY_MS) phase = "returning"; // ended yesterday: returns today
    else if (start.getTime() <= dayMs) phase = "current";
    else phase = "upcoming";
  } else if (availability.state === "on_vacation") phase = "current";
  else if (availability.state === "vacation_soon" || availability.state === "vacation_tomorrow") phase = "upcoming";
  else if (availability.state === "returns_today") phase = "returning";
  else phase = "available";

  if (phase === "available") return { phase, kind: null, badgeLabel: "Available" };
  if (phase === "returning") return { phase, kind: null, badgeLabel: "Returns today" };
  const kind = leaveKind(availability);
  if (phase === "current") return { phase, kind, badgeLabel: "On leave" };
  return { phase, kind, badgeLabel: kind === "vacation" ? "Vacation soon" : "Leave soon" };
}

import type { PersonAvailability } from "../people/types";
import { resolveAvailabilityPresentation } from "./availabilityPresentation";
import { formatLeaveCountdown, formatLeaveRangeLabel } from "./leaveCalendar";

import { appNow } from "../../platform/appClock";
/** Short label for availability badges (no comparison period). Delegates to the shared resolver. */
export function personAvailabilityBadgeLabel(
  availability: PersonAvailability,
  today: Date = appNow(),
): string {
  return resolveAvailabilityPresentation(availability, today).badgeLabel;
}

export function personAvailabilityDrawerLine(
  availability: PersonAvailability,
  today = appNow(),
): string {
  const presentation = resolveAvailabilityPresentation(availability, today);
  const range = formatLeaveRangeLabel(availability.startDate, availability.endDate);
  switch (presentation.phase) {
    case "available":
      return "Available";
    case "returning":
      return "Returns today";
    case "current":
      return range ? `On time off · ${range}` : availability.label;
    case "upcoming": {
      if (!availability.startDate) return availability.label;
      const countdown = formatLeaveCountdown(availability.startDate, today);
      const noun = presentation.kind === "vacation" ? "Vacation" : "Leave";
      return range ? `${noun} ${countdown} · ${range}` : `${noun} ${countdown}`;
    }
  }
}

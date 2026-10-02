import type { PersonAvailability } from "../people/types";
import {
  formatLeaveCountdown,
  formatLeaveRangeLabel,
  isUpcomingLeaveState,
} from "./leaveCalendar";

export function personAvailabilityDrawerLine(
  availability: PersonAvailability,
  today = new Date(),
): string {
  if (availability.state === "available") {
    return "Available";
  }
  if (availability.state === "on_vacation") {
    const range = formatLeaveRangeLabel(
      availability.startDate,
      availability.endDate,
    );
    return range ? `On time off · ${range}` : availability.label;
  }
  if (isUpcomingLeaveState(availability.state) && availability.startDate) {
    const range = formatLeaveRangeLabel(
      availability.startDate,
      availability.endDate,
    );
    const countdown = formatLeaveCountdown(availability.startDate, today);
    return range ? `Vacation ${countdown} · ${range}` : `Vacation ${countdown}`;
  }
  if (availability.state === "returns_today") {
    return "Returns today";
  }
  return availability.label;
}

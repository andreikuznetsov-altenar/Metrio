import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { Person } from "../people/types";

export function vacationTrayLabelForPerson(person: Person): string | null {
  const state = person.availability.state;
  if (
    state !== "vacation_soon" &&
    state !== "vacation_tomorrow" &&
    state !== "on_vacation"
  ) {
    return null;
  }

  const start = person.availability.startDate;
  const end = person.availability.endDate;
  const range =
    start && end
      ? ` · ${formatShortRange(start, end)}`
      : start
        ? ` · ${format(parseISO(start.slice(0, 10)), "d MMM")}`
        : "";

  if (state === "on_vacation") {
    return `Vacation today${range}`;
  }

  if (!start) {
    return person.availability.label || "Vacation soon";
  }

  const days = differenceInCalendarDays(
    parseISO(start.slice(0, 10)),
    new Date(),
  );

  if (days <= 0) return `Vacation today${range}`;
  if (days === 1) return `Vacation tomorrow${range}`;
  return `Vacation in ${days} days${range}`;
}

function formatShortRange(start: string, end: string): string {
  const s = parseISO(start.slice(0, 10));
  const e = parseISO(end.slice(0, 10));
  if (s.getMonth() === e.getMonth()) {
    return `${format(s, "d")}–${format(e, "d MMM")}`;
  }
  return `${format(s, "d MMM")}–${format(e, "d MMM")}`;
}

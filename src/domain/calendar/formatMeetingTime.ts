import { format, isToday, parseISO } from "date-fns";

export function formatMeetingTime(iso: string, dateOnly = false): string {
  const parsed = parseISO(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  if (dateOnly) {
    return format(parsed, "d MMM");
  }
  if (isToday(parsed)) {
    return format(parsed, "HH:mm");
  }
  return format(parsed, "EEE HH:mm");
}

import { format, isToday, parseISO } from "date-fns";

export function formatPreferenceSyncTimestamp(
  iso: string | null | undefined,
): string {
  if (!iso) return "Never";
  try {
    const date = parseISO(iso);
    if (Number.isNaN(date.getTime())) return "Never";
    if (isToday(date)) {
      return `Today, ${format(date, "HH:mm")}`;
    }
    return format(date, "d MMM yyyy, HH:mm");
  } catch {
    return "Never";
  }
}

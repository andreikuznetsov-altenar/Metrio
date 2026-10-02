import {
  format,
  isToday,
  isYesterday,
  parseISO,
  differenceInMinutes,
  differenceInHours,
} from "date-fns";

export function formatNotificationRelativeTime(iso: string, now = new Date()): string {
  const date = parseISO(iso);
  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = differenceInHours(now, date);
  if (hours < 24 && isToday(date)) {
    return `${hours} h ago`;
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "d MMM");
}

export function formatNotificationExactTime(iso: string): string {
  return format(parseISO(iso), "PPpp");
}

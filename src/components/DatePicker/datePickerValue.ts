import { format, parseISO, startOfDay } from "date-fns";

export function parseIsoDateOnly(value: string): Date | null {
  if (!value || value.length < 10) return null;
  try {
    const d = startOfDay(parseISO(value.slice(0, 10)));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function toIsoDateOnly(date: Date): string {
  return format(startOfDay(date), "yyyy-MM-dd");
}

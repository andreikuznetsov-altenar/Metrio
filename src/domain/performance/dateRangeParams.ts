import { format, subMonths, subYears } from "date-fns";
import type { DateRangeKey } from "../performance";
import { getLastNDaysRange } from "../periods/dateRange";

export function dateRangeKeyToBounds(
  key: DateRangeKey,
  now = new Date(),
): { dateFrom: string; dateTo: string } {
  const dateTo = format(now, "yyyy-MM-dd");
  if (key === "7d") {
    const { start } = getLastNDaysRange(7, now);
    return { dateFrom: format(start, "yyyy-MM-dd"), dateTo };
  }
  if (key === "30d") {
    const { start } = getLastNDaysRange(30, now);
    return { dateFrom: format(start, "yyyy-MM-dd"), dateTo };
  }
  if (key === "3m") {
    return { dateFrom: format(subMonths(now, 3), "yyyy-MM-dd"), dateTo };
  }
  if (key === "6m") {
    return { dateFrom: format(subMonths(now, 6), "yyyy-MM-dd"), dateTo };
  }
  return { dateFrom: format(subYears(now, 1), "yyyy-MM-dd"), dateTo };
}

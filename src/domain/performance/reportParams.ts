import { getEarliestFetchDate } from "../history/historyRanges";
import type { DateRangeKey, PerformanceReviewTarget } from "../performance";
import { dateRangeKeyToBounds } from "./dateRangeParams";

export type PerformanceAudience = "team" | "employee";

export function reviewTargetToTeamScope(
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
): "direct" | "full" {
  if (audience === "employee") {
    return "direct";
  }
  if (reviewTarget === "org") {
    return "full";
  }
  return "direct";
}

export interface PerformanceReportRanges {
  displayDateFrom: string;
  displayDateTo: string;
  fetchDateFrom: string;
  fetchDateTo: string;
  teamScope: "direct" | "full";
}

export function resolvePerformanceReportRanges(
  dateRangeKey: DateRangeKey,
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
  now = new Date(),
): PerformanceReportRanges {
  const { dateFrom, dateTo } = dateRangeKeyToBounds(dateRangeKey, now);
  const fetchDateFrom = getEarliestFetchDate(dateFrom, dateTo);
  return {
    displayDateFrom: dateFrom,
    displayDateTo: dateTo,
    fetchDateFrom,
    fetchDateTo: dateTo,
    teamScope: reviewTargetToTeamScope(reviewTarget, audience),
  };
}

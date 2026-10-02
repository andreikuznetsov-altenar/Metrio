import { getEarliestFetchDate } from "../history/historyRanges";
import type { PerformanceReviewTarget } from "../performance";
import type { PerformanceDateRange } from "./performanceDateRange";
import { resolveReviewTargetPolicy } from "./reviewTargetPolicy";

export type PerformanceAudience = "team" | "employee";

export function reviewTargetToTeamScope(
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
  configuredTargetReviewDays: number,
): "direct" | "full" {
  return resolveReviewTargetPolicy(
    reviewTarget,
    configuredTargetReviewDays,
    audience,
  ).teamScope;
}

export interface PerformanceReportRanges {
  displayDateFrom: string;
  displayDateTo: string;
  fetchDateFrom: string;
  fetchDateTo: string;
  teamScope: "direct" | "full";
  targetReviewDays: number;
}

export function resolvePerformanceReportRanges(
  dateRange: PerformanceDateRange,
  reviewTarget: PerformanceReviewTarget,
  audience: PerformanceAudience,
  configuredTargetReviewDays: number,
  now = new Date(),
): PerformanceReportRanges {
  void now;
  const policy = resolveReviewTargetPolicy(
    reviewTarget,
    configuredTargetReviewDays,
    audience,
  );
  const fetchDateFrom = getEarliestFetchDate(dateRange.from, dateRange.to);
  return {
    displayDateFrom: dateRange.from,
    displayDateTo: dateRange.to,
    fetchDateFrom,
    fetchDateTo: dateRange.to,
    teamScope: policy.teamScope,
    targetReviewDays: policy.targetReviewDays,
  };
}

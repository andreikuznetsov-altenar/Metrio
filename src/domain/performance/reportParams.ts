import { resolveRequiredComparisonCoverage } from "../history/historyRanges";
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
  comparisonDateFrom: string;
  comparisonDateTo: string;
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
  const policy = resolveReviewTargetPolicy(
    reviewTarget,
    configuredTargetReviewDays,
    audience,
  );
  const coverage = resolveRequiredComparisonCoverage(dateRange, now);
  return {
    displayDateFrom: dateRange.from,
    displayDateTo: dateRange.to,
    comparisonDateFrom: coverage.comparisonRange.from,
    comparisonDateTo: coverage.comparisonRange.to,
    fetchDateFrom: coverage.requiredFetchStart,
    fetchDateTo: coverage.requiredFetchEnd,
    teamScope: policy.teamScope,
    targetReviewDays: policy.targetReviewDays,
  };
}

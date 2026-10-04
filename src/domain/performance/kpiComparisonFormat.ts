import type { MetricCardData } from "../performance";
import { comparisonPeriodLabel, type PerformanceDateRange } from "./performanceDateRange";
import type { TrendComparison } from "../trends/trendEngine";

export function comparisonCaptionForRange(
  dateRange?: PerformanceDateRange,
  fallback = "vs previous period",
): string {
  if (!dateRange) return fallback;
  return comparisonPeriodLabel(dateRange);
}

/** Single line for executive surfaces: delta + comparison period. */
export function formatMetricComparisonLine(
  contextLabel: string,
  contextCaption?: string,
): string {
  const delta = contextLabel.trim();
  const caption = (contextCaption ?? "vs previous period").trim();
  if (!delta || delta === "—") return caption;
  return `${delta} ${caption}`;
}

export function metricComparisonFromTrend(
  comparison: TrendComparison,
  dateRangeKey: import("../performance").DateRangeKey,
  captionOverride?: string,
): Pick<MetricCardData, "contextLabel" | "contextSemantic" | "contextCaption"> {
  if (!comparison.sufficient || comparison.unknown) return {};
  const label = comparison.label.trim();
  if (!label || label === "—" || label === "N/A") return {};
  const caption =
    captionOverride ??
    (dateRangeKey === "7d"
      ? "vs previous 7 days"
      : dateRangeKey === "30d"
        ? "vs previous 30 days"
        : dateRangeKey === "3m"
          ? "vs previous 3 months"
          : dateRangeKey === "6m"
            ? "vs previous 6 months"
            : dateRangeKey === "1y"
              ? "vs previous year"
              : "vs previous period");
  return {
    contextLabel: label,
    contextCaption: caption,
  };
}

import type {
  DateRangeKey,
  MetricContextSemantic,
  TrendCardData,
} from "../../domain/performance";
import type {
  TrendComparison,
  TrendDirection,
  TrendSufficiency,
} from "../../domain/trends/trendEngine";

export function trendSemanticFromComparison(
  comparison: TrendComparison,
): MetricContextSemantic {
  if (!comparison.sufficient || comparison.unknown) return "unknown";
  if (comparison.direction === "flat") return "neutral";
  if (comparison.direction === "up") return "positive";
  if (comparison.direction === "down") return "negative";
  return "neutral";
}

export function movementDirectionFromDelta(delta: number): TrendDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function trendComparisonCaption(dateRangeKey: DateRangeKey): string {
  switch (dateRangeKey) {
    case "7d":
      return "vs previous 7 days";
    case "30d":
      return "vs previous 30 days";
    case "3m":
      return "vs previous 3 months";
    case "6m":
      return "vs previous 6 months";
    case "1y":
      return "vs previous year";
    default:
      return "vs previous period";
  }
}

export function buildTrendCardData(
  label: string,
  comparison: TrendComparison,
  options?: {
    sparkline?: number[];
    chartSeries?: { date: string; value: number }[];
    trendMetricKind?: TrendCardData["trendMetricKind"];
    sufficiency?: TrendSufficiency;
  },
): TrendCardData {
  const sufficient = comparison.sufficient;
  const sparkline = options?.sparkline;
  return {
    label,
    value: sufficient ? comparison.label : "Not enough history",
    sparkline:
      sufficient && sparkline && sparkline.length >= 2 ? sparkline : undefined,
    chartSeries:
      sufficient && options?.chartSeries && options.chartSeries.length >= 2
        ? options.chartSeries
        : undefined,
    insufficientHistory: !sufficient,
    historyRecordedDays: options?.sufficiency?.daysRecorded,
    historyRecommendedDays: options?.sufficiency?.recommended,
    trendMetricKind: options?.trendMetricKind,
    trendMovementDirection: sufficient
      ? movementDirectionFromDelta(comparison.absoluteDelta)
      : "unknown",
    trendSemantic: sufficient
      ? trendSemanticFromComparison(comparison)
      : "unknown",
  };
}

export function metricContextFromComparison(
  comparison: TrendComparison,
  dateRangeKey: DateRangeKey,
  captionOverride?: string,
): Pick<
  import("../../domain/performance").MetricCardData,
  "contextLabel" | "contextSemantic" | "contextCaption"
> {
  if (!comparison.sufficient) return {};
  return {
    contextLabel: comparison.label,
    contextSemantic: trendSemanticFromComparison(comparison),
    contextCaption: captionOverride ?? trendComparisonCaption(dateRangeKey),
  };
}

export function severityAttentionLabel(
  severity: import("../../domain/radar/types").RadarSeverity,
): string {
  if (severity === "critical") return "High";
  if (severity === "warning") return "Medium";
  return "Low";
}

export function formatAttentionHealthLabel(status: string): string {
  const normalized = status.replace(/_/g, " ").trim().toLowerCase();
  if (!normalized) return "Needs attention";
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

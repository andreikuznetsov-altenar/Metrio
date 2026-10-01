import type { MetricContextSemantic, TrendCardData } from "../../domain/performance";
import type { TrendComparison } from "../../domain/trends/trendEngine";

export function trendSemanticFromComparison(
  comparison: TrendComparison,
): MetricContextSemantic {
  if (!comparison.sufficient || comparison.unknown) return "unknown";
  if (comparison.direction === "flat") return "neutral";
  if (comparison.direction === "up") return "positive";
  if (comparison.direction === "down") return "negative";
  return "neutral";
}

export function buildTrendCardData(
  label: string,
  comparison: TrendComparison,
  sparkline?: number[],
): TrendCardData {
  const sufficient = comparison.sufficient;
  return {
    label,
    value: sufficient
      ? comparison.label
      : comparison.sufficiencyMessage || "Not enough history yet",
    sparkline: sufficient && sparkline && sparkline.length >= 2 ? sparkline : undefined,
    insufficientHistory: !sufficient,
    trendDirection: comparison.direction,
    trendSemantic: trendSemanticFromComparison(comparison),
  };
}

export function metricContextFromComparison(
  comparison: TrendComparison,
): Pick<import("../../domain/performance").MetricCardData, "contextLabel" | "contextSemantic"> {
  if (!comparison.sufficient) return {};
  return {
    contextLabel: comparison.label,
    contextSemantic: trendSemanticFromComparison(comparison),
  };
}

export function severityAttentionLabel(severity: import("../../domain/radar/types").RadarSeverity): string {
  if (severity === "critical") return "High";
  if (severity === "warning") return "Medium";
  return "Low";
}

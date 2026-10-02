import { useMemo } from "react";
import type { PerformanceReviewTarget } from "../../domain/performance";
import { formatPerformanceDateDisplay } from "../../domain/performance/performanceDateRange";
import { buildAnalyticsEvidence } from "../../domain/analytics/buildAnalyticsEvidence";
import type { AnalyticsDrilldownMetric } from "../../domain/analytics/analyticsEvidenceTypes";
import {
  buildIssueAttributionIndex,
  flattenTeamKpiIssues,
  targetScopeLabel,
} from "../../domain/analytics/analyticsReportScope";
import type { PerformanceFetchResult } from "../../services/performance/performanceTypes";
import type { MetricCardData, TrendCardData } from "../../domain/performance";

export interface AnalyticsDrilldownRequest {
  metric: AnalyticsDrilldownMetric;
  comparisonLabel?: string;
  bucketDate?: string;
  bucketValue?: number;
  trendBackflowEvents?: boolean;
}

export function metricLabelToDrilldownMetric(label: string): AnalyticsDrilldownMetric | null {
  if (label === "Efficiency") return "efficiency";
  if (label === "First pass") return "first_pass";
  if (label === "Completed") return "completed";
  if (label === "Backflows") return "backflows";
  if (label === "Avg cycle") return "avg_cycle";
  return null;
}

export function trendLabelToDrilldownMetric(label: string): AnalyticsDrilldownMetric | null {
  return metricLabelToDrilldownMetric(label);
}

export function useAnalyticsEvidence(
  data: PerformanceFetchResult | null,
  reviewTarget: PerformanceReviewTarget,
  request: AnalyticsDrilldownRequest | null,
  summaryMetric?: MetricCardData,
) {
  return useMemo(() => {
    if (!data || !request) return null;
    const report = data.reportData;
    const issues = flattenTeamKpiIssues(report.grouped);
    const attributionIndex = buildIssueAttributionIndex(report.grouped);
    const params = report.params;
    const rangeLabel = `${formatPerformanceDateDisplay(params.dateFrom)} – ${formatPerformanceDateDisplay(params.dateTo)}`;

    return buildAnalyticsEvidence({
      metric: request.metric,
      issues,
      params,
      kpi: report.teamKpi,
      attributionIndex,
      rangeLabel,
      targetLabel: targetScopeLabel(reviewTarget),
      comparisonLabel: request.comparisonLabel ?? summaryMetric?.contextLabel,
      bucketDate: request.bucketDate,
      trendBackflowEvents: request.trendBackflowEvents,
      issuesAvailable: issues.length > 0,
    });
  }, [data, request, reviewTarget, summaryMetric]);
}

export function buildTrendDrilldownRequest(
  trend: TrendCardData,
  point: { date: string; value: number },
): AnalyticsDrilldownRequest | null {
  const metric = trendLabelToDrilldownMetric(trend.label);
  if (!metric) return null;
  return {
    metric,
    bucketDate: point.date,
    bucketValue: point.value,
    trendBackflowEvents: metric === "backflows",
  };
}

import { useMemo } from "react";
import type { PerformanceReviewTarget } from "../../domain/performance";
import { formatPerformanceDateDisplay } from "../../domain/performance/performanceDateRange";
import { buildAnalyticsEvidence } from "../../domain/analytics/buildAnalyticsEvidence";
import type { AnalyticsDrilldownMetric } from "../../domain/analytics/analyticsEvidenceTypes";
import {
  personIssuesFromReport,
  personKpiFromReport,
} from "../../domain/analytics/personAnalyticsScope";
import {
  buildIssueAttributionIndex,
  flattenTeamKpiIssues,
  targetScopeLabel,
} from "../../domain/analytics/analyticsReportScope";
import { personRouteKey } from "../../domain/people/personDisplay";
import type { PerformanceFetchResult } from "../../services/performance/performanceTypes";
import type { MetricCardData, TrendCardData } from "../../domain/performance";

export interface AnalyticsDrilldownRequest {
  metric: AnalyticsDrilldownMetric;
  comparisonLabel?: string;
  bucketDate?: string;
  bucketValue?: number;
  trendBackflowEvents?: boolean;
  personId?: string;
  personDisplayName?: string;
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

function resolvePersonScope(
  data: PerformanceFetchResult,
  request: AnalyticsDrilldownRequest,
):
  | {
      personReportKey: string;
      personKpi: ReturnType<typeof personKpiFromReport>;
      personDisplayName: string;
      personId: string;
      scopedIssues: ReturnType<typeof personIssuesFromReport>;
    }
  | null {
  if (!request.personId) return null;
  const person = data.teamSnapshot.persons.find((item) => item.id === request.personId);
  if (!person) return null;
  const personReportKey = personRouteKey(person);
  const report = data.reportData;
  return {
    personReportKey,
    personKpi: personKpiFromReport(report, personReportKey),
    personDisplayName: request.personDisplayName || person.bamboo.displayName,
    personId: person.id,
    scopedIssues: personIssuesFromReport(report, personReportKey),
  };
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
    const personScope = resolvePersonScope(data, request);
    const issues = personScope
      ? personScope.scopedIssues
      : flattenTeamKpiIssues(report.grouped);
    const attributionIndex = buildIssueAttributionIndex(report.grouped);
    const params = report.params;
    const rangeLabel = `${formatPerformanceDateDisplay(params.dateFrom)} – ${formatPerformanceDateDisplay(params.dateTo)}`;
    const personKpi = personScope?.personKpi;

    return buildAnalyticsEvidence({
      metric: request.metric,
      issues: personScope ? flattenTeamKpiIssues(report.grouped) : issues,
      params,
      kpi: personKpi ?? report.teamKpi,
      attributionIndex,
      rangeLabel,
      targetLabel: targetScopeLabel(reviewTarget),
      comparisonLabel: request.comparisonLabel ?? summaryMetric?.contextLabel,
      bucketDate: request.bucketDate,
      trendBackflowEvents: request.trendBackflowEvents,
      issuesAvailable: issues.length > 0,
      personReportKey: personScope?.personReportKey,
      personKpi: personKpi ?? undefined,
      personDisplayName: personScope?.personDisplayName,
      personId: personScope?.personId,
    });
  }, [data, request, reviewTarget, summaryMetric]);
}

export function buildTrendDrilldownRequest(
  trend: TrendCardData,
  point: { date: string; value: number },
  personScope?: Pick<AnalyticsDrilldownRequest, "personId" | "personDisplayName">,
): AnalyticsDrilldownRequest | null {
  const metric = trendLabelToDrilldownMetric(trend.label);
  if (!metric) return null;
  return {
    metric,
    bucketDate: point.date,
    bucketValue: point.value,
    trendBackflowEvents: metric === "backflows",
    ...personScope,
  };
}

export function buildMetricDrilldownRequest(
  metric: MetricCardData,
  personScope?: Pick<AnalyticsDrilldownRequest, "personId" | "personDisplayName">,
): AnalyticsDrilldownRequest | null {
  const id = metricLabelToDrilldownMetric(metric.label);
  if (!id) return null;
  return {
    metric: id,
    comparisonLabel: metric.contextLabel,
    ...personScope,
  };
}

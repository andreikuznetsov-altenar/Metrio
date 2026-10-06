import { useMemo } from "react";
import type { PerformanceReviewTarget } from "../../domain/performance";
import {
  formatPerformanceDateRangeDisplay,
} from "../../domain/performance/performanceDateRange";
import { buildKpiFromIssues } from "../../domain/jira/kpi";
import {
  buildAnalyticsEvidence,
  reconcileEvidenceCount,
} from "../../domain/analytics/buildAnalyticsEvidence";
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
import {
  buildPersonReportKeyIndex,
  personRouteKey,
} from "../../domain/people/personDisplay";
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
    const scopedIssues = personScope
      ? personScope.scopedIssues
      : flattenTeamKpiIssues(report.grouped);
    const attributionIndex = buildIssueAttributionIndex(report.grouped);
    const reportKeyToPersonId = buildPersonReportKeyIndex(data.teamSnapshot.persons);
    const params = report.params;
    const rangeLabel = formatPerformanceDateRangeDisplay(params.dateFrom, params.dateTo);
    const personReportKey = personScope?.personReportKey;
    const personDerivedKpi =
      personReportKey && scopedIssues.length > 0
        ? buildKpiFromIssues(scopedIssues, {}, params)
        : null;
    const personKpi =
      personDerivedKpi ?? personScope?.personKpi ?? report.teamKpi;

    const evidence = buildAnalyticsEvidence({
      metric: request.metric,
      issues: scopedIssues,
      params,
      kpi: personScope ? personKpi : report.teamKpi,
      attributionIndex,
      rangeLabel,
      targetLabel: targetScopeLabel(reviewTarget),
      comparisonLabel: request.comparisonLabel ?? summaryMetric?.contextLabel,
      bucketDate: request.bucketDate,
      trendBackflowEvents: request.trendBackflowEvents,
      issuesAvailable: scopedIssues.length > 0,
      personReportKey,
      personKpi: personScope ? personKpi : undefined,
      personDisplayName: personScope?.personDisplayName,
      personId: personScope?.personId,
      reportKeyToPersonId,
    });

    if (import.meta.env.DEV && evidence && !reconcileEvidenceCount(evidence)) {
      console.warn("[analytics] KPI evidence invariant failed", {
        metric: evidence.metric,
        personId: evidence.personId,
        detailLevel: evidence.detailLevel,
        kpiCompleted: evidence.kpi.completedCount,
        issueCount: evidence.issues.length,
      });
    }

    return evidence;
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

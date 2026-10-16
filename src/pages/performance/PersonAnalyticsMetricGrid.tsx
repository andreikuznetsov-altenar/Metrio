import { Badge } from "../../components/Badge/Badge";
import { Card } from "../../components/Card/Card";
import { HelpIcon } from "../../components/HelpIcon/HelpIcon";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { MetricCardData } from "../../domain/performance";
import { formatMetricComparisonLine } from "../../domain/performance/kpiComparisonFormat";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { metricLabelToDrilldownMetric } from "./analyticsDrilldownModel";
import "../../components/KpiCard/kpi-card.css";

const METRIC_HELP: Record<string, string> = {
  Throughput: performanceHelp.throughput,
  "First Pass": performanceHelp.firstPass,
  "Rework Rate": performanceHelp.reworkRate,
  Completed: performanceHelp.completed,
  "Backflow Events": performanceHelp.backflows,
  "Cycle Time":
    "Median elapsed business time from contributor-cycle start to successful completion.",
};

function metricValueBlock(metric: MetricCardData) {
  if (metric.cycleSegments?.length) {
    return (
      <div className="performance-metric-card__cycle-segments">
        {metric.cycleSegments.map((segment) => (
          <div key={segment.label} className="performance-metric-card__cycle-segment">
            <span className="performance-metric-card__cycle-segment-label">
              {segment.label}
            </span>
            <span className="performance-metric-card__cycle-segment-value">
              {segment.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <div className="performance-metric-card__value">{metric.value}</div>;
}

const DRILLDOWN_LABELS = new Set(["First Pass", "Completed", "Backflow Events"]);

export interface PersonAnalyticsMetricGridProps {
  metrics: MetricCardData[];
  className?: string;
  onOpenMetric?: (metric: MetricCardData, source: HTMLElement) => void;
}

export function PersonAnalyticsMetricGrid({
  metrics,
  className = "performance-metrics performance-metrics--compact",
  onOpenMetric,
}: PersonAnalyticsMetricGridProps) {
  return (
    <div className={className}>
      {metrics.map((metric) => {
        const drilldownMetric = metricLabelToDrilldownMetric(metric.label);
        const interactive = Boolean(onOpenMetric && drilldownMetric && DRILLDOWN_LABELS.has(metric.label));
        const cardClass = interactive
          ? "performance-metric-card performance-metric-card--interactive"
          : "performance-metric-card";
        const ariaLabel = interactive
          ? `View ${metric.label} details, ${metric.value}`
          : undefined;

        return (
          <Card key={metric.label} className={cardClass}>
            <div className="performance-metric-card__label">
              {metric.label}
              {METRIC_HELP[metric.label] ? (
                <span
                  className="performance-metric-card__help"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <HelpIcon label={METRIC_HELP[metric.label]} />
                </span>
              ) : null}
            </div>
            {interactive && onOpenMetric ? (
              <button
                type="button"
                className="performance-metric-card__trigger"
                aria-label={ariaLabel}
                onClick={(event) => onOpenMetric(metric, event.currentTarget)}
              >
                {metricValueBlock(metric)}
                {metric.detail ? <div className="performance-metric-card__detail">{metric.detail}</div> : null}
                {metric.contextLabel ? (
                  <div
                    className={`performance-metric-card__context performance-metric-card__context--${metric.contextSemantic || "neutral"}`}
                  >
                    <Tooltip
                      content={formatMetricComparisonLine(
                        metric.contextLabel,
                        metric.contextCaption,
                      )}
                    >
                      <span className="performance-metric-card__context-line">
                        <span className="performance-metric-card__context-delta">
                          {metric.contextLabel}
                        </span>
                        {metric.contextCaption ? (
                          <span className="performance-metric-card__context-caption">
                            {metric.contextCaption}
                          </span>
                        ) : null}
                      </span>
                    </Tooltip>
                  </div>
                ) : metric.status ? (
                  <div className="performance-metric-card__status">
                    {metric.statusVariant ? (
                      <Badge variant={metric.statusVariant}>{metric.status}</Badge>
                    ) : (
                      metric.status
                    )}
                  </div>
                ) : null}
              </button>
            ) : (
              <>
                {metricValueBlock(metric)}
                {metric.detail ? <div className="performance-metric-card__detail">{metric.detail}</div> : null}
                {metric.contextLabel ? (
                  <div
                    className={`performance-metric-card__context performance-metric-card__context--${metric.contextSemantic || "neutral"}`}
                  >
                    <span className="performance-metric-card__context-line">
                      <span className="performance-metric-card__context-delta">
                        {metric.contextLabel}
                      </span>
                      {metric.contextCaption ? (
                        <span className="performance-metric-card__context-caption">
                          {metric.contextCaption}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ) : metric.status ? (
                  <div className="performance-metric-card__status">
                    {metric.statusVariant ? (
                      <Badge variant={metric.statusVariant}>{metric.status}</Badge>
                    ) : (
                      metric.status
                    )}
                  </div>
                ) : null}
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

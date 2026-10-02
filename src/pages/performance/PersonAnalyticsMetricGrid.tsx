import { Badge } from "../../components/Badge/Badge";
import { Card } from "../../components/Card/Card";
import { HelpIcon } from "../../components/HelpIcon/HelpIcon";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { MetricCardData } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { metricLabelToDrilldownMetric } from "./analyticsDrilldownModel";

const METRIC_HELP: Record<string, string> = {
  Efficiency: performanceHelp.efficiency,
  "First pass": performanceHelp.firstPass,
  Completed: performanceHelp.completed,
  Backflows: performanceHelp.backflows,
};

const DRILLDOWN_LABELS = new Set(["Efficiency", "First pass", "Completed", "Backflows"]);

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
                <div className="performance-metric-card__value">{metric.value}</div>
                {metric.contextLabel ? (
                  <div
                    className={`performance-metric-card__context performance-metric-card__context--${metric.contextSemantic || "neutral"}`}
                  >
                    <Tooltip
                      content={
                        metric.contextCaption
                          ? `${metric.contextCaption}`
                          : metric.contextLabel
                      }
                    >
                      <span>{metric.contextLabel}</span>
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
                <div className="performance-metric-card__value">{metric.value}</div>
                {metric.contextLabel ? (
                  <div
                    className={`performance-metric-card__context performance-metric-card__context--${metric.contextSemantic || "neutral"}`}
                  >
                    <span>{metric.contextLabel}</span>
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

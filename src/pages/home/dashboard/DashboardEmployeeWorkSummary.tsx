import type { HomeKnowledgeItem } from "../../../domain/home/homeTypes";
import type { TrendCardData } from "../../../domain/performance";
import type { WorkloadResult } from "../../../domain/workload/workloadEngine";
import { Button } from "../../../components/Button/Button";
import { TrendMiniChart } from "../../performance/TrendMiniChart";
import { TrendValue } from "../../performance/TrendValue";

function metricValue(
  metrics: Array<{ label: string; value: string }>,
  label: string,
): string {
  return metrics.find((metric) => metric.label === label)?.value ?? "—";
}

export interface DashboardEmployeeWorkSummaryProps {
  trends: TrendCardData[];
  metrics: Array<{ label: string; value: string }>;
  workload: WorkloadResult | null;
  resources: HomeKnowledgeItem[];
  onOpenResource: (url: string) => void;
  onPointClick?: (
    trend: TrendCardData,
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => void;
}

export function DashboardEmployeeWorkSummary({
  trends,
  metrics,
  workload,
  resources,
  onOpenResource,
  onPointClick,
}: DashboardEmployeeWorkSummaryProps) {
  const trend =
    trends.find((item) => item.label === "Completed") ??
    trends.find((item) => item.label === "Efficiency") ??
    trends[0];

  return (
    <>
      <section
        className="executive-dashboard__span-12 executive-employee-summary"
        aria-label="Work summary"
        data-testid="employee-dashboard-work-summary"
      >
        <div className="executive-employee-summary__grid">
          <article className="executive-panel executive-employee-summary-card" data-testid="employee-dashboard-trend-card">
            <h2 className="executive-panel__title">Trend</h2>
            {trend ? (
              <>
                <TrendValue trend={trend} />
                {trend.chartSeries && trend.chartSeries.length >= 2 ? (
                  <TrendMiniChart
                    trend={trend}
                    onPointClick={
                      onPointClick
                        ? (point, source) => onPointClick(trend, point, source)
                        : undefined
                    }
                  />
                ) : (
                  <p className="executive-secondary-line" role="status">
                    {trend.insufficientHistoryMessage ?? "Not enough history for chart"}
                  </p>
                )}
              </>
            ) : (
              <p className="executive-secondary-line" role="status">
                Not enough history for chart
              </p>
            )}
          </article>
          <article className="executive-panel executive-employee-summary-card" data-testid="employee-dashboard-current-work-card">
            <h2 className="executive-panel__title">Current work</h2>
            <dl className="executive-employee-summary-card__stats">
              <div>
                <dt>Active</dt>
                <dd>{workload?.activeWorkCount ?? workload?.activeCount ?? 0}</dd>
              </div>
              <div>
                <dt>In review</dt>
                <dd>{workload?.reviewCount ?? 0}</dd>
              </div>
              <div>
                <dt>On hold</dt>
                <dd>{workload?.holdCount ?? 0}</dd>
              </div>
            </dl>
          </article>
          <article className="executive-panel executive-employee-summary-card" data-testid="employee-dashboard-delivery-quality-card">
            <h2 className="executive-panel__title">Delivery quality</h2>
            <dl className="executive-employee-summary-card__stats">
              <div>
                <dt>First pass</dt>
                <dd>{metricValue(metrics, "First pass")}</dd>
              </div>
              <div>
                <dt>Backflows</dt>
                <dd>{metricValue(metrics, "Backflows")}</dd>
              </div>
              <div>
                <dt>Avg cycle</dt>
                <dd>{metricValue(metrics, "Avg cycle")}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      {resources.length > 0 ? (
        <section
          className="executive-dashboard__span-12 executive-panel executive-resources-card"
          aria-label="Resources"
          data-testid="employee-dashboard-resources"
        >
          <h2 className="executive-panel__title">Resources</h2>
          <div className="executive-resources-card__list">
            {resources.slice(0, 4).map((resource) => (
              <div key={resource.id} className="executive-resources-card__row">
                <div className="executive-resources-card__text">
                  <span className="executive-resources-card__title">{resource.title}</span>
                  {resource.contextLabel ? (
                    <span className="executive-resources-card__meta">
                      {resource.contextLabel}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => onOpenResource(resource.url)}
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

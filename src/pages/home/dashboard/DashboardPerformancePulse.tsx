import type { TrendCardData } from "../../../domain/performance";
import { TrendMiniChart } from "../../performance/TrendMiniChart";
import { TrendValue } from "../../performance/TrendValue";

const PULSE_LABELS = ["Completed", "First pass", "Backflows"] as const;

export interface DashboardPerformancePulseProps {
  trends: TrendCardData[];
  onPointClick?: (
    trend: TrendCardData,
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => void;
}

export function DashboardPerformancePulse({
  trends,
  onPointClick,
}: DashboardPerformancePulseProps) {
  const pulseTrends = PULSE_LABELS.map((label) =>
    trends.find((t) => t.label === label),
  ).filter((t): t is TrendCardData => Boolean(t));

  if (!pulseTrends.length) return null;

  return (
    <section
      className="executive-dashboard__span-12 executive-panel executive-pulse"
      aria-label="Performance pulse"
      data-testid="dashboard-performance-pulse"
    >
      <h2 className="executive-panel__title">Performance pulse</h2>
      <div className="executive-pulse__grid">
        {pulseTrends.map((trend) => (
          <article
            key={trend.label}
            className="executive-pulse__chart-card"
            data-testid={`dashboard-pulse-${trend.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="executive-pulse__chart-label">{trend.label}</div>
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
          </article>
        ))}
      </div>
    </section>
  );
}

import type { TrendCardData } from "../../domain/performance";
import { useOptionalPerformanceAnalytics } from "../../app/performanceAnalyticsContext";
import { TrendMiniChart } from "./TrendMiniChart";
import { TrendValue } from "./TrendValue";
import { buildTrendDrilldownRequest } from "./analyticsDrilldownModel";

export interface EmployeeTrendsViewProps {
  trends: TrendCardData[];
  personId: string;
  personDisplayName: string;
}

export function EmployeeTrendsView({
  trends,
  personId,
  personDisplayName,
}: EmployeeTrendsViewProps) {
  const analytics = useOptionalPerformanceAnalytics();

  return (
    <section aria-label="Trends">
      <div className="performance-trends performance-trends--employee">
        {trends.map((trend) => (
          <div key={trend.label} className="performance-trend-card performance-trend-card--flat">
            <div className="performance-trend-card__label">{trend.label}</div>
            <TrendValue trend={trend} />
            {trend.chartSeries && trend.chartSeries.length >= 2 ? (
              <TrendMiniChart
                trend={trend}
                onPointClick={
                  analytics
                    ? (point, source) => {
                        const request = buildTrendDrilldownRequest(trend, point, {
                          personId,
                          personDisplayName,
                        });
                        if (!request) return;
                        analytics.openPersonAnalyticsDrilldown(personId, request, source);
                      }
                    : undefined
                }
              />
            ) : trend.insufficientHistory ? null : (
              <div className="performance-trend-card__sparkline-empty" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

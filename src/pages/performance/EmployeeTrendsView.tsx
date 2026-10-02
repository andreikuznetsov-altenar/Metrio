import { Card } from "../../components/Card/Card";
import type { TrendCardData } from "../../domain/performance";
import { TrendInsufficientHistory, TrendMiniChart } from "./TrendMiniChart";
import { TrendValue } from "./TrendValue";

export function EmployeeTrendsView({ trends }: { trends: TrendCardData[] }) {
  return (
    <section aria-label="Trends">
      <div className="performance-trends">
        {trends.map((trend) => (
          <Card key={trend.label} className="performance-trend-card">
            <div className="performance-trend-card__label">{trend.label}</div>
            <TrendValue trend={trend} />
            {trend.chartSeries && trend.chartSeries.length >= 2 ? (
              <TrendMiniChart trend={trend} />
            ) : trend.insufficientHistory ? (
              <TrendInsufficientHistory
                recorded={trend.historyRecordedDays}
                recommended={trend.historyRecommendedDays}
              />
            ) : (
              <div className="performance-trend-card__sparkline-empty" aria-hidden />
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

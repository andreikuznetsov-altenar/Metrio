import { Card } from "../../components/Card/Card";
import type { TrendCardData } from "../../domain/performance";
import { Sparkline } from "./Sparkline";
import { TrendValue } from "./TrendValue";

export function EmployeeTrendsView({ trends }: { trends: TrendCardData[] }) {
  return (
    <section aria-label="Trends">
      <div className="performance-trends">
        {trends.map((trend) => (
          <Card key={trend.label} className="performance-trend-card">
            <div className="performance-trend-card__label">{trend.label}</div>
            <TrendValue trend={trend} />
            {trend.sparkline ? (
              <Sparkline values={trend.sparkline} />
            ) : trend.insufficientHistory ? (
              <div className="performance-trend-card__sparkline-empty">
                Not enough history
              </div>
            ) : (
              <div className="performance-trend-card__sparkline-empty" aria-hidden />
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

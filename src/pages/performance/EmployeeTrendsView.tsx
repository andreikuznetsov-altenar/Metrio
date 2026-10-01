import { Card } from "../../components/Card/Card";
import type { TrendCardData } from "../../domain/performance";
import { Sparkline } from "./Sparkline";

export function EmployeeTrendsView({ trends }: { trends: TrendCardData[] }) {
  return (
    <section aria-label="Trends">
      <div className="performance-trends">
        {trends.map((trend) => (
          <Card key={trend.label} className="performance-trend-card">
            <div className="performance-trend-card__label">{trend.label}</div>
            <div className="performance-trend-card__value">{trend.value}</div>
            {trend.sparkline ? <Sparkline values={trend.sparkline} /> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

import { Card } from "../../components/Card/Card";
import { HelpIcon } from "../../components/HelpIcon/HelpIcon";
import type { MetricCardData } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { PersonAnalyticsMetricGrid } from "./PersonAnalyticsMetricGrid";

const CYCLE_HELP =
  "Average segment durations for active cycles: Progress → Review (P → R) and Review → Done (R → D).";

export interface PersonPerformanceMetricsProps {
  kpis: MetricCardData[];
  cycleTime: { label: string; value: string }[];
  activeWorkCount?: number;
  showActiveSummary?: boolean;
  onOpenMetric?: (metric: MetricCardData, source: HTMLElement) => void;
}

export function PersonPerformanceMetrics({
  kpis,
  cycleTime,
  activeWorkCount,
  showActiveSummary = false,
  onOpenMetric,
}: PersonPerformanceMetricsProps) {
  return (
    <div className="person-performance-metrics">
      <PersonAnalyticsMetricGrid metrics={kpis} onOpenMetric={onOpenMetric} />
      {cycleTime.length > 0 ? (
        <Card className="person-cycle-time-card">
          <div className="person-cycle-time-card__head">
            <span className="person-cycle-time-card__title">Cycle time</span>
            <HelpIcon label={CYCLE_HELP} />
          </div>
          <dl className="person-cycle-time-card__segments">
            {cycleTime.map((segment) => (
              <div key={segment.label} className="person-cycle-time-card__row">
                <dt>{segment.label}</dt>
                <dd>{segment.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}
      {showActiveSummary && activeWorkCount != null ? (
        <p className="person-performance-metrics__active" data-testid="person-active-summary">
          Active work: <strong>{activeWorkCount}</strong>
        </p>
      ) : null}
    </div>
  );
}

export const PERSON_KPI_HELP: Record<string, string> = {
  Efficiency: performanceHelp.efficiency,
  "First pass": performanceHelp.firstPass,
  Completed: performanceHelp.completed,
  Backflows: performanceHelp.backflows,
};

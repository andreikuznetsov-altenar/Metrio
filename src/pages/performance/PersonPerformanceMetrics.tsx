import type { MetricCardData } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { PersonCycleTimeCard } from "../../components/PersonCycleTimeCard/PersonCycleTimeCard";
import { PersonAnalyticsMetricGrid } from "./PersonAnalyticsMetricGrid";

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
      <PersonCycleTimeCard segments={cycleTime} />
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

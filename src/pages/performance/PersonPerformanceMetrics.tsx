import type { MetricCardData } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { PersonCycleTimeCard } from "../../components/PersonCycleTimeCard/PersonCycleTimeCard";
import { PersonAnalyticsMetricGrid } from "./PersonAnalyticsMetricGrid";

export interface PersonPerformanceMetricsProps {
  kpis: MetricCardData[];
  cycleTime: { label: string; value: string }[];
  activeWorkCount?: number;
  showActiveSummary?: boolean;
  /** `two-by-two` keeps the four KPI cards as a 2 × 2 grid (narrow drawers); default is one row. */
  layout?: "row" | "two-by-two";
  onOpenMetric?: (metric: MetricCardData, source: HTMLElement) => void;
}

export function PersonPerformanceMetrics({
  kpis,
  cycleTime,
  activeWorkCount,
  showActiveSummary = false,
  layout = "row",
  onOpenMetric,
}: PersonPerformanceMetricsProps) {
  return (
    <div className="person-performance-metrics">
      <PersonAnalyticsMetricGrid
        metrics={kpis}
        className={
          layout === "two-by-two"
            ? "performance-metrics performance-metrics--two-by-two"
            : "performance-metrics"
        }
        onOpenMetric={onOpenMetric}
      />
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
  Throughput: performanceHelp.throughput,
  "First pass": performanceHelp.firstPass,
  Completed: performanceHelp.completed,
  "Backflow events": performanceHelp.backflows,
};

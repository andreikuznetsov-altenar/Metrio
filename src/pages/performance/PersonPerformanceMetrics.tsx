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

/**
 * The narrow-drawer KPI block is a deliberate balanced 2 x 2 grid. Rework Rate (the complement of
 * First Pass) therefore sits on the First Pass card instead of becoming a fifth, orphaned card.
 */
export function foldReworkRateIntoFirstPass(kpis: MetricCardData[]): MetricCardData[] {
  const rework = kpis.find((metric) => metric.label === "Rework Rate");
  if (!rework) return kpis;
  return kpis
    .filter((metric) => metric.label !== "Rework Rate")
    .map((metric) =>
      metric.label === "First Pass"
        ? { ...metric, detail: `Rework Rate ${rework.value}` }
        : metric,
    );
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
        metrics={layout === "two-by-two" ? foldReworkRateIntoFirstPass(kpis) : kpis}
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
  "First Pass": performanceHelp.firstPass,
  "Rework Rate": performanceHelp.reworkRate,
  Completed: performanceHelp.completed,
  "Backflow Events": performanceHelp.backflows,
};

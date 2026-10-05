import { useMemo, useState } from "react";
import type { TrendCardData } from "../../../domain/performance";
import { TrendMiniChart } from "../../performance/TrendMiniChart";
import { TrendValue } from "../../performance/TrendValue";

const DEFAULT_LABELS = ["Completed", "First pass", "Efficiency"] as const;

export function DashboardPrimaryTrend({
  trends,
  spanClass,
  onPointClick,
}: {
  trends: TrendCardData[];
  spanClass: string;
  onPointClick?: (
    trend: TrendCardData,
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => void;
}) {
  const options = useMemo(() => {
    const picked = DEFAULT_LABELS.map((label) => trends.find((t) => t.label === label)).filter(
      (t): t is TrendCardData => Boolean(t),
    );
    if (picked.length) return picked;
    return trends.slice(0, 3);
  }, [trends]);

  const [selectedLabel, setSelectedLabel] = useState(options[0]?.label ?? "");
  const selected = options.find((t) => t.label === selectedLabel) ?? options[0];

  if (!selected) return null;

  return (
    <section
      className={`${spanClass} executive-panel executive-primary-trend`}
      aria-label="Performance trend"
      data-testid="dashboard-primary-trend"
    >
      <div className="executive-panel__title-row">
        <h2 className="executive-panel__title">Trend</h2>
        {options.length > 1 ? (
          <label className="executive-primary-trend__selector">
            <span className="visually-hidden">Metric</span>
            <select
              value={selected.label}
              onChange={(event) => setSelectedLabel(event.target.value)}
            >
              {options.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="executive-primary-trend__body">
        <TrendValue trend={selected} />
        {selected.chartSeries && selected.chartSeries.length >= 2 ? (
          <TrendMiniChart
            trend={selected}
            onPointClick={
              onPointClick
                ? (point, source) => onPointClick(selected, point, source)
                : undefined
            }
          />
        ) : (
          <p className="executive-secondary-line" role="status">
            {selected.insufficientHistoryMessage ?? "Not enough history for chart"}
          </p>
        )}
      </div>
    </section>
  );
}

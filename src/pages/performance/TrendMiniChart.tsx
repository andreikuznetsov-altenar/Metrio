import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendCardData } from "../../domain/performance";
import "./trend-mini-chart.css";

/** Recharts/SVG gradient ids cannot contain spaces — invalid ids break fill and show gray. */
export const TREND_CHART_ACCENT = "var(--color-accent)";
export const TREND_CHART_FILL_OPACITY = 0.1;

export interface TrendMiniChartProps {
  trend: TrendCardData;
  onPointClick?: (
    point: { date: string; value: number },
    source: HTMLElement | null,
  ) => void;
}

function formatValue(
  kind: TrendCardData["trendMetricKind"],
  value: number,
): string {
  if (kind === "percent") return `${value.toFixed(1)}%`;
  if (kind === "duration") return `${value.toFixed(1)}d`;
  return String(Math.round(value));
}

function ChartTooltip({
  active,
  payload,
  trend,
}: {
  active?: boolean;
  payload?: { payload: { date: string; value: number } }[];
  trend: TrendCardData;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="trend-chart-tooltip">
      <div className="trend-chart-tooltip__date">
        {format(parseISO(point.date), "d MMM yyyy")}
      </div>
      <div className="trend-chart-tooltip__value">
        {trend.label}: {formatValue(trend.trendMetricKind, point.value)}
      </div>
      <div className="trend-chart-tooltip__hint">Click to view work</div>
    </div>
  );
}

export function TrendMiniChart({ trend, onPointClick }: TrendMiniChartProps) {
  const data = trend.chartSeries ?? [];
  if (data.length < 2) return null;

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = max === min ? (max === 0 ? 1 : max * 0.1) : (max - min) * 0.12;
  const strokeHalf = 0.75;
  const domain: [number, number] = [
    Math.max(0, min - pad),
    max + pad + strokeHalf,
  ];

  return (
    <div
      className={
        onPointClick
          ? "trend-mini-chart trend-mini-chart--clickable"
          : "trend-mini-chart"
      }
      data-testid="trend-mini-chart"
    >
      <ResponsiveContainer width="100%" height={56}>
        <AreaChart
          data={data}
          margin={{ top: 6, right: 0, left: 0, bottom: 6 }}
          onClick={(state) => {
            const payload = (
              state as { activePayload?: { payload: { date: string; value: number } }[] }
            )?.activePayload?.[0]?.payload;
            if (payload && onPointClick) {
              onPointClick(payload, null);
            }
          }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.35} />
          <XAxis dataKey="date" hide />
          <YAxis domain={domain} hide />
          <Tooltip
            cursor={{ stroke: TREND_CHART_ACCENT, strokeOpacity: 0.35, strokeWidth: 1 }}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={
                  props.payload as unknown as
                    | { payload: { date: string; value: number } }[]
                    | undefined
                }
                trend={trend}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={TREND_CHART_ACCENT}
            strokeWidth={1.5}
            fill={TREND_CHART_ACCENT}
            fillOpacity={TREND_CHART_FILL_OPACITY}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: TREND_CHART_ACCENT }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendInsufficientHistory({
  recorded,
  recommended,
}: {
  recorded?: number;
  recommended?: number;
}) {
  const progress =
    recorded != null && recommended != null && recommended > 0
      ? Math.min(100, Math.round((recorded / recommended) * 100))
      : null;

  return (
    <div className="performance-trend-card__history-state" data-testid="trend-insufficient-history">
      <div className="performance-trend-card__history-title">Not enough history</div>
      {recorded != null && recommended != null ? (
        <div className="performance-trend-card__history-meta">
          {recorded} of {recommended} days collected
        </div>
      ) : null}
      {progress != null ? (
        <div
          className="performance-trend-card__history-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

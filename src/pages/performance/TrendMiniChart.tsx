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

export interface TrendMiniChartProps {
  trend: TrendCardData;
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
    </div>
  );
}

export function TrendMiniChart({ trend }: TrendMiniChartProps) {
  const data = trend.chartSeries ?? [];
  if (data.length < 2) return null;

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = max === min ? (max === 0 ? 1 : max * 0.1) : (max - min) * 0.12;
  const domain: [number, number] = [
    trend.trendMetricKind === "percent" ? Math.max(0, min - pad) : Math.max(0, min - pad),
    max + pad,
  ];

  return (
    <div className="trend-mini-chart" data-testid="trend-mini-chart">
      <ResponsiveContainer width="100%" height={56}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`trend-fill-${trend.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.35} />
          <XAxis dataKey="date" hide />
          <YAxis domain={domain} hide />
          <Tooltip
            cursor={{ stroke: "var(--color-accent)", strokeOpacity: 0.35 }}
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
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            fill={`url(#trend-fill-${trend.label})`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: "var(--color-accent)" }}
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

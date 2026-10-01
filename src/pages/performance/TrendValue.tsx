import type { TrendCardData } from "../../domain/performance";

function arrowForDirection(direction: TrendCardData["trendDirection"]): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "flat") return "→";
  return "";
}

export function TrendValue({ trend }: { trend: TrendCardData }) {
  const semantic = trend.trendSemantic || "unknown";
  return (
    <div
      className={`performance-trend-card__value performance-trend-card__value--${semantic}`}
    >
      {trend.trendDirection && trend.trendDirection !== "unknown" ? (
        <span className="performance-trend-card__arrow" aria-hidden>
          {arrowForDirection(trend.trendDirection)}
        </span>
      ) : null}
      <span>{trend.value}</span>
    </div>
  );
}

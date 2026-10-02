import type { TrendCardData } from "../../domain/performance";

function arrowForDirection(
  direction: TrendCardData["trendMovementDirection"],
): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "flat") return "→";
  return "";
}

export function TrendValue({ trend }: { trend: TrendCardData }) {
  const semantic = trend.trendSemantic || "unknown";
  const movement = trend.trendMovementDirection;
  return (
    <div
      className={`performance-trend-card__value performance-trend-card__value--${semantic}`}
    >
      {movement && movement !== "unknown" ? (
        <span className="performance-trend-card__arrow" aria-hidden>
          {arrowForDirection(movement)}
        </span>
      ) : null}
      <span>{trend.value}</span>
    </div>
  );
}

import type { HomeDeliverySummary } from "../../../domain/home/homeTypes";

function barWidth(value: number, total: number): string {
  if (total <= 0 || value <= 0) return "0%";
  const pct = Math.max(8, Math.round((value / total) * 100));
  return `${pct}%`;
}

export function DashboardDeliveryVisual({
  summary,
}: {
  summary: HomeDeliverySummary;
}) {
  const total =
    summary.problematic + summary.longReview + summary.backflowSignals || 1;
  const rows = [
    { label: "Problematic", value: summary.problematic, tone: "danger" as const },
    { label: "Long review", value: summary.longReview, tone: "warning" as const },
    { label: "Backflow", value: summary.backflowSignals, tone: "default" as const },
  ];
  const hasSignal = rows.some((row) => row.value > 0);
  if (!hasSignal) return null;

  return (
    <section
      className="executive-panel executive-dashboard__span-6"
      aria-label="Delivery signals"
      data-testid="dashboard-delivery-visual"
    >
      <h2 className="executive-panel__title">Delivery</h2>
      <div className="executive-delivery-bars">
        {rows.map((row) => (
          <div key={row.label} className="executive-delivery-bar-row">
            <span>{row.label}</span>
            <div className="executive-delivery-bar-row__track" aria-hidden>
              <span
                className={`executive-delivery-bar-row__fill executive-delivery-bar-row__fill--${row.tone}`}
                style={{ width: barWidth(row.value, total) }}
              />
            </div>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

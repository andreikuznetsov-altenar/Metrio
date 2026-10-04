import { Button } from "../../../components/Button/Button";
import type { HomeDeliverySummary } from "../../../domain/home/homeTypes";

function barWidth(value: number, total: number): string {
  if (total <= 0 || value <= 0) return "0%";
  const pct = Math.max(8, Math.round((value / total) * 100));
  return `${pct}%`;
}

export function DashboardDeliverySummaryCard({
  summary,
  onOpenDeliveryRisk,
}: {
  summary: HomeDeliverySummary;
  onOpenDeliveryRisk: () => void;
}) {
  const total =
    summary.problematic + summary.longReview + summary.backflowSignals || 1;
  const rows = [
    {
      label: "Problematic",
      value: summary.problematic,
      tone: "danger" as const,
    },
    {
      label: "Long Review",
      value: summary.longReview,
      tone: "warning" as const,
    },
    {
      label: "Backflow signals",
      value: summary.backflowSignals,
      tone: "default" as const,
    },
  ];

  return (
    <section
      className="executive-panel"
      aria-label="Delivery summary"
      data-testid="dashboard-delivery-summary"
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
            <span aria-label={`${row.label} count`}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className="home-card__actions">
        <Button type="button" variant="secondary" onClick={onOpenDeliveryRisk}>
          Open Delivery Risk
        </Button>
      </div>
    </section>
  );
}

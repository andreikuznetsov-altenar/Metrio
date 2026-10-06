import { Button } from "../../../components/Button/Button";
import type { HomeDeliverySummary } from "../../../domain/home/homeTypes";

export function DashboardDeliveryRiskCard({
  deliveryRiskCount,
  summary,
  onOpen,
}: {
  deliveryRiskCount: number;
  summary: HomeDeliverySummary;
  onOpen: () => void;
}) {
  if (deliveryRiskCount <= 0 && summary.longReview <= 0 && summary.problematic <= 0) {
    return null;
  }

  const detailParts: string[] = [];
  if (summary.longReview > 0) {
    detailParts.push(
      `${summary.longReview} long review${summary.longReview === 1 ? "" : "s"}`,
    );
  }
  if (summary.problematic > 0) {
    detailParts.push(`${summary.problematic} problematic`);
  }
  if (summary.backflowSignals > 0) {
    detailParts.push(`${summary.backflowSignals} backflow signal${summary.backflowSignals === 1 ? "" : "s"}`);
  }

  return (
    <article
      className="executive-lower-card"
      data-testid="dashboard-delivery-risk-card"
    >
      <h3 className="executive-lower-card__title">Delivery risk</h3>
      <p className="executive-lower-card__headline">
        {deliveryRiskCount} item{deliveryRiskCount === 1 ? "" : "s"} need review
      </p>
      <p className="executive-lower-card__description">
        {detailParts.length
          ? `${detailParts.join(" and ")} require attention in the selected period.`
          : "Delivery signals in the selected period require attention."}
      </p>
      <div className="executive-lower-card__cta">
        <Button type="button" variant="secondary" onClick={onOpen}>
          Open delivery risk
        </Button>
      </div>
    </article>
  );
}

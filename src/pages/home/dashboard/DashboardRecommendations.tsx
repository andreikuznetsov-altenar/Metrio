import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import type { ProductRecommendation } from "../../../domain/recommendations/buildProductRecommendations";

const SEVERITY_VARIANT = {
  critical: "danger",
  watch: "warning",
  neutral: "neutral",
} as const;

const SEVERITY_LABEL = {
  critical: "Critical",
  watch: "Watch",
  neutral: "Info",
} as const;

export function DashboardRecommendations({
  items,
  onAction,
}: {
  items: ProductRecommendation[];
  onAction: (item: ProductRecommendation) => void;
}) {
  if (!items.length) return null;

  return (
    <section
      className="executive-dashboard__span-12 executive-panel"
      aria-label="Recommendations"
      data-testid="dashboard-recommendations"
    >
      <div className="executive-panel__title-row">
        <h2 className="executive-panel__title">Recommendations</h2>
        <span className="executive-recommendations__count">{items.length}</span>
      </div>
      <ul className="executive-recommendations__list">
        {items.map((item) => (
          <li key={item.id} className="executive-recommendations__item">
            <div className="executive-recommendations__head">
              <Badge variant={SEVERITY_VARIANT[item.severity]}>
                {SEVERITY_LABEL[item.severity]}
              </Badge>
              <p className="executive-recommendations__title">{item.title}</p>
            </div>
            <p className="executive-recommendations__copy">{item.explanation}</p>
            <Button type="button" variant="secondary" onClick={() => onAction(item)}>
              {item.actionLabel}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

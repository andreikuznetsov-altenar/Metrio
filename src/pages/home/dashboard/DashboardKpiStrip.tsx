import { Badge } from "../../../components/Badge/Badge";
import { HelpIcon } from "../../../components/HelpIcon/HelpIcon";
import type { DashboardKpiCard } from "../../../domain/home/buildDashboardKpis";
import "../../../components/KpiCard/kpi-card.css";

export function DashboardKpiStrip({ cards }: { cards: DashboardKpiCard[] }) {
  if (!cards.length) return null;
  return (
    <section
      className="executive-dashboard__span-12"
      aria-label="Key metrics"
      data-testid="dashboard-kpi-strip"
    >
      <div className="executive-kpi-strip">
        {cards.map((card) => (
          <article key={card.id} className="executive-kpi-card">
            <div className="executive-kpi-card__label-row">
              <p className="executive-kpi-card__label">{card.label}</p>
              {card.tooltip ? <HelpIcon label={card.tooltip} /> : null}
            </div>
            <p className="executive-kpi-card__value">{card.value}</p>
            {card.badge ? (
              <Badge variant={card.badge.variant} className="executive-kpi-card__badge">
                {card.badge.label}
              </Badge>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

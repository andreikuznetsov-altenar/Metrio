import { Badge } from "../../../components/Badge/Badge";
import type { ExecutiveAttentionItem } from "../../../domain/home/executiveDashboardModel";

const TONE_VARIANT = {
  critical: "danger",
  warning: "warning",
  neutral: "neutral",
} as const;

export function DashboardAttentionNow({ items }: { items: ExecutiveAttentionItem[] }) {
  if (!items.length) return null;

  const critical = items.filter((i) => i.severity === "critical").length;
  const warning = items.filter((i) => i.severity === "warning").length;

  return (
    <section
      className="executive-dashboard__span-4 executive-panel"
      aria-label="Attention now"
      data-testid="dashboard-attention-now"
    >
      <div className="executive-panel__title-row">
        <h2 className="executive-panel__title">Attention now</h2>
        <span className="executive-attention-now__summary">
          {critical > 0 ? (
            <Badge variant="danger">{critical} critical</Badge>
          ) : null}
          {warning > 0 ? (
            <Badge variant="warning">{warning} watch</Badge>
          ) : null}
        </span>
      </div>
      <ul className="executive-attention-now__list">
        {items.map((item) => (
          <li key={item.id} className="executive-attention-now__item">
            <Badge variant={TONE_VARIANT[item.severity]}>{item.severity}</Badge>
            <div>
              <p className="executive-attention-now__title">{item.title}</p>
              {item.detail ? (
                <p className="executive-attention-now__detail">{item.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

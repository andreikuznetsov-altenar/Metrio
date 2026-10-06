import { Badge } from "../../../components/Badge/Badge";
import type { ExecutiveAttentionItem } from "../../../domain/home/executiveDashboardModel";

const TONE_VARIANT = {
  critical: "danger",
  warning: "warning",
  neutral: "neutral",
} as const;

const SEVERITY_LABEL = {
  critical: "Critical",
  warning: "Watch",
  neutral: "Info",
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
      <div className="executive-attention-now__table-wrap metrio-scroll">
        <table className="executive-attention-now__table">
          <thead>
            <tr>
              <th scope="col">Severity</th>
              <th scope="col">Subject</th>
              <th scope="col">Context</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="executive-attention-now__severity">
                  <Badge variant={TONE_VARIANT[item.severity]}>
                    {SEVERITY_LABEL[item.severity]}
                  </Badge>
                </td>
                <td className="executive-attention-now__subject">{item.title}</td>
                <td className="executive-attention-now__context">
                  {item.detail ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

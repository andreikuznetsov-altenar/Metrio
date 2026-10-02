import { Badge } from "../../components/Badge/Badge";
import { SectionTitle } from "../../components/SectionTitle/SectionTitle";
import type { DeliveryRiskRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";

function statusVariant(status: string): "danger" | "warning" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("block")) return "danger";
  if (normalized.includes("review") || normalized.includes("rework")) {
    return "warning";
  }
  return "neutral";
}

export interface TeamDeliveryRiskViewProps {
  rows: DeliveryRiskRow[];
}

export function TeamDeliveryRiskView({ rows }: TeamDeliveryRiskViewProps) {
  if (rows.length === 0) {
    return (
      <section aria-label="Delivery risk">
        <SectionTitle title="Delivery risk" help={performanceHelp.deliveryRisk} />
        <div className="performance-empty performance-empty--compact">
          <span className="performance-empty__icon" aria-hidden>
            ◎
          </span>
          <span>No delivery risks for this period.</span>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Delivery risk">
      <SectionTitle title="Delivery risk" help={performanceHelp.deliveryRisk} />
      <div className="performance-table-wrap">
        <table className="performance-table performance-table--interactive">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Owner</th>
              <th className="performance-table__num">Age</th>
              <th>Status</th>
              <th>Risk reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.issueKey}>
                <td>
                  <div className="performance-issue-key">{row.issueKey}</div>
                  <div className="performance-work-row__title">
                    {row.issueTitle}
                  </div>
                </td>
                <td>{row.ownerName || row.ownerId}</td>
                <td className="performance-table__num">{row.age}</td>
                <td>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </td>
                <td className="performance-table__reason">{row.riskReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

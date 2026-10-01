import type { DeliveryRiskRow } from "../../domain/performance";

export interface TeamDeliveryRiskViewProps {
  rows: DeliveryRiskRow[];
}

export function TeamDeliveryRiskView({ rows }: TeamDeliveryRiskViewProps) {
  if (rows.length === 0) {
    return (
      <section aria-label="Delivery risk">
        <div className="performance-empty performance-table-wrap">
          No delivery risks for this period.
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Delivery risk">
      <div className="performance-table-wrap">
        <table className="performance-table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Owner</th>
              <th>Age</th>
              <th>Status</th>
              <th>Risk reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.issueKey}>
                <td>
                  <div className="performance-work-row__key">{row.issueKey}</div>
                  <div className="performance-work-row__title">
                    {row.issueTitle}
                  </div>
                </td>
                <td>{row.ownerName || row.ownerId}</td>
                <td>{row.age}</td>
                <td>{row.status}</td>
                <td>{row.riskReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

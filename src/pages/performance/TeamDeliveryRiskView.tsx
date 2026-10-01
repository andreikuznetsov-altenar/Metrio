import type { DeliveryRiskRow } from "../../domain/performance";
import { getPerson } from "../../fixtures/people";

export interface TeamDeliveryRiskViewProps {
  rows: DeliveryRiskRow[];
}

export function TeamDeliveryRiskView({ rows }: TeamDeliveryRiskViewProps) {
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
            {rows.map((row) => {
              const owner = getPerson(row.ownerId);
              return (
                <tr key={row.issueKey}>
                  <td>
                    <div className="performance-work-row__key">{row.issueKey}</div>
                    <div className="performance-work-row__title">
                      {row.issueTitle}
                    </div>
                  </td>
                  <td>{owner.name}</td>
                  <td>{row.age}</td>
                  <td>{row.status}</td>
                  <td>{row.riskReason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { Badge } from "../../components/Badge/Badge";
import type { TeamRadarRow } from "../../domain/performance";

export interface TeamRadarViewProps {
  rows: TeamRadarRow[];
}

export function TeamRadarView({ rows }: TeamRadarViewProps) {
  if (rows.length === 0) {
    return (
      <section aria-label="Radar">
        <div className="performance-empty performance-table-wrap">
          No active team risks.
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Radar">
      <div className="performance-table-wrap">
        <table className="performance-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Severity</th>
              <th>Reason</th>
              <th>Tasks affected</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.personId}-${row.reason}`}>
                <td>{row.personName}</td>
                <td>
                  <Badge variant={row.severityVariant}>{row.severity}</Badge>
                </td>
                <td>{row.reason}</td>
                <td>{row.tasksAffected}</td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

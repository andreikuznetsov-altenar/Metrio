import { Badge } from "../../components/Badge/Badge";
import { SectionTitle } from "../../components/SectionTitle/SectionTitle";
import type { TeamRadarRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";

export interface TeamRadarViewProps {
  rows: TeamRadarRow[];
}

export function TeamRadarView({ rows }: TeamRadarViewProps) {
  if (rows.length === 0) {
    return (
      <section aria-label="Radar">
        <SectionTitle title="Radar" help={performanceHelp.radar} />
        <div className="performance-empty performance-empty--compact">
          <span className="performance-empty__icon" aria-hidden>
            ◎
          </span>
          <span>No active team risks.</span>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Radar">
      <SectionTitle title="Radar" help={performanceHelp.radar} />
      <div className="performance-table-wrap">
        <table className="performance-table performance-table--interactive">
          <thead>
            <tr>
              <th>Person</th>
              <th>Severity</th>
              <th>Reason</th>
              <th className="performance-table__num">Tasks</th>
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
                <td className="performance-table__reason">{row.reason}</td>
                <td className="performance-table__num">{row.tasksAffected}</td>
                <td>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { Badge } from "../../components/Badge/Badge";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import type { TeamRadarRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";

export interface TeamRadarViewProps {
  rows: TeamRadarRow[];
  onOpenPerson: (personId: string) => void;
}

export function TeamRadarView({ rows, onOpenPerson }: TeamRadarViewProps) {
  if (rows.length === 0) {
    return (
      <section aria-label="Radar">
        <p className="performance-section-desc">{performanceHelp.radar}</p>
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
      <p className="performance-section-desc">{performanceHelp.radar}</p>
      <div className="performance-table-wrap">
        <table className="performance-table performance-table--interactive">
          <thead>
            <tr>
              <th>Person</th>
              <th>Reason</th>
              <th className="performance-table__num">Tasks</th>
              <th>Action</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.personId}-${row.reason}`}>
                <td>
                  <button
                    type="button"
                    className="performance-table__person-link"
                    onClick={() => onOpenPerson(row.personId)}
                  >
                    <span className="performance-table__person-inline">
                      <PersonAvatar
                        personId={row.personId}
                        displayName={row.personName || row.personId}
                        size="sm"
                      />
                      {row.personName}
                    </span>
                  </button>
                </td>
                <td className="performance-table__reason">{row.reason}</td>
                <td className="performance-table__num">{row.tasksAffected}</td>
                <td>{row.action}</td>
                <td>
                  <Badge variant={row.severityVariant}>{row.severity}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

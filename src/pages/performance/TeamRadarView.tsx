import { useMemo } from "react";
import { Badge } from "../../components/Badge/Badge";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import type { TeamRadarRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";

const RADAR_COLUMNS = [
  { id: "person", type: "person" as const },
  { id: "reason", type: "text" as const },
  { id: "tasks", type: "number" as const },
  { id: "action", type: "text" as const },
  {
    id: "severity",
    type: "status" as const,
    statusKind: "attentionSeverity" as const,
  },
];

export interface TeamRadarViewProps {
  rows: TeamRadarRow[];
  onOpenPerson: (personId: string) => void;
}

export function TeamRadarView({ rows, onOpenPerson }: TeamRadarViewProps) {
  const getValue = useMemo(
    () => (row: TeamRadarRow, columnId: string) => {
      switch (columnId) {
        case "person":
          return row.personName || row.personId;
        case "reason":
          return row.reason;
        case "tasks":
          return row.tasksAffected;
        case "action":
          return row.action;
        case "severity":
          return row.severity;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(rows, RADAR_COLUMNS, getValue);

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
              <SortableTableHeader columnId="person" label="Person" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader columnId="reason" label="Reason" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader
                columnId="tasks"
                label="Tasks"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
              <SortableTableHeader columnId="action" label="Action" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader columnId="severity" label="Severity" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
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

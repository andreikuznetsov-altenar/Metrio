import { Badge } from "../../components/Badge/Badge";
import type { TeamPeopleRow } from "../../domain/performance";

function workloadVariant(
  workload: TeamPeopleRow["workload"],
): "success" | "warning" | "neutral" {
  if (workload === "Heavy") return "warning";
  if (workload === "Light") return "success";
  return "neutral";
}

export interface TeamPeopleViewProps {
  rows: TeamPeopleRow[];
  onOpenPerson: (personId: string) => void;
}

export function TeamPeopleView({ rows, onOpenPerson }: TeamPeopleViewProps) {
  return (
    <section aria-label="People">
      <div className="performance-table-wrap">
        <table className="performance-table performance-table--interactive">
          <thead>
            <tr>
              <th>Person</th>
              <th className="performance-table__num">Efficiency</th>
              <th>Workload</th>
              <th>Availability</th>
              <th>Attention</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.personId}>
                <td>
                  <button
                    type="button"
                    className="performance-table__person-button"
                    onClick={() => onOpenPerson(row.personId)}
                  >
                    <span className="performance-table__person-name">
                      {row.personName}
                    </span>
                    <span className="performance-table__person-role">
                      {row.role}
                    </span>
                  </button>
                </td>
                <td className="performance-table__num">{row.efficiency}</td>
                <td>
                  <Badge variant={workloadVariant(row.workload)}>
                    {row.workload}
                  </Badge>
                </td>
                <td>
                  <Badge variant="neutral">{row.availability}</Badge>
                </td>
                <td>
                  <Badge variant={row.attentionVariant}>
                    {row.attentionState}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

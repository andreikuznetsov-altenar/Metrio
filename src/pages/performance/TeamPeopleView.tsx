import { Badge } from "../../components/Badge/Badge";
import type { TeamPeopleRow } from "../../domain/performance";
import { roleLabel } from "../../domain/types";
import { getPerson } from "../../fixtures/people";

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
              <th>Role</th>
              <th>Efficiency</th>
              <th>Workload</th>
              <th>Availability</th>
              <th>Attention state</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const person = getPerson(row.personId);
              return (
                <tr key={row.personId}>
                  <td>
                    <button
                      type="button"
                      className="performance-table__person-button"
                      onClick={() => onOpenPerson(row.personId)}
                    >
                      {person.name}
                    </button>
                  </td>
                  <td>{roleLabel(person.role)}</td>
                  <td>{row.efficiency}</td>
                  <td>{row.workload}</td>
                  <td>{row.availability}</td>
                  <td>
                    <Badge variant={row.attentionVariant}>
                      {row.attentionState}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

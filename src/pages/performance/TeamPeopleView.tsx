import { Badge } from "../../components/Badge/Badge";
import { SectionTitle } from "../../components/SectionTitle/SectionTitle";
import type { TeamPeopleRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import {
  availabilityBadgeVariant,
  workloadBadgeVariantFromLabel,
} from "../../domain/performance/performanceStatusBadges";

export interface TeamPeopleViewProps {
  rows: TeamPeopleRow[];
  onOpenPerson: (personId: string) => void;
}

export function TeamPeopleView({ rows, onOpenPerson }: TeamPeopleViewProps) {
  return (
    <section aria-label="People">
      <SectionTitle title="People" help={performanceHelp.people} />
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
                  <Badge variant={workloadBadgeVariantFromLabel(row.workload)}>
                    {row.workload}
                  </Badge>
                </td>
                <td>
                  <Badge variant={availabilityBadgeVariant(row.availability)}>
                    {row.availability}
                  </Badge>
                </td>
                <td>
                  {row.attentionSeverityLabel === "Stable" ? (
                    <Badge variant="success">Stable</Badge>
                  ) : (
                    <div className="performance-people-attention">
                      <Badge variant={row.attentionVariant}>
                        {row.attentionSeverityLabel}
                      </Badge>
                      {row.attentionIssueKey ? (
                        <span className="performance-people-attention__key">
                          {row.attentionIssueKey}
                        </span>
                      ) : null}
                      <span className="performance-people-attention__reason">
                        {row.attentionReason}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

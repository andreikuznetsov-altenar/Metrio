import { Badge } from "../../components/Badge/Badge";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
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
      <p className="performance-section-desc">{performanceHelp.people}</p>
      <div className="performance-table-wrap">
        <table className="performance-table performance-table--interactive">
          <thead>
            <tr>
              <th>Person</th>
              <th className="performance-table__num">Efficiency</th>
              <th>Attention</th>
              <th>Availability</th>
              <th>Workload</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.personId}>
                <td>
                  <button
                    type="button"
                    className="performance-table__person-button performance-table__person-button--with-avatar"
                    onClick={() => onOpenPerson(row.personId)}
                  >
                    <PersonAvatar
                      employeeId={row.personId}
                      displayName={row.personName || row.personId}
                      size="sm"
                    />
                    <span className="performance-table__person-text">
                      <span className="performance-table__person-name">
                        {row.personName}
                      </span>
                      <span className="performance-table__person-role">
                        {row.role}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="performance-table__num">{row.efficiency}</td>
                <td>
                  {row.attentionSeverityLabel === "Stable" ? (
                    <Badge variant="success">Stable</Badge>
                  ) : (
                    <div className="performance-people-attention">
                      <div className="performance-people-attention__line">
                        <Badge variant={row.attentionVariant}>
                          {row.attentionSeverityLabel}
                        </Badge>
                        {row.attentionIssueKey ? (
                          <span className="performance-people-attention__key">
                            {row.attentionIssueKey}
                          </span>
                        ) : null}
                      </div>
                      <span className="performance-people-attention__reason">
                        {row.attentionReason}
                      </span>
                    </div>
                  )}
                </td>
                <td>
                  <Badge variant={availabilityBadgeVariant(row.availability)}>
                    {row.availability}
                  </Badge>
                </td>
                <td>
                  <Badge variant={workloadBadgeVariantFromLabel(row.workload)}>
                    {row.workload}
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

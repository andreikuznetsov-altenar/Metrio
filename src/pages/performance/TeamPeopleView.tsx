import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { EntityLink } from "../../components/EntityLink/EntityLink";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { resolveJiraBaseUrl } from "../../config/product";
import type { TeamPeopleRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import {
  availabilityBadgeVariant,
  workloadBadgeVariantFromLabel,
} from "../../domain/performance/performanceStatusBadges";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { loadPreferences } from "../../platform/preferences";
import type { PersonDrawerTab } from "../../app/performanceAnalyticsContext";

const PEOPLE_COLUMNS = [
  { id: "person", type: "person" as const },
  { id: "efficiency", type: "text" as const },
  { id: "attention", type: "text" as const },
  {
    id: "availability",
    type: "status" as const,
    statusKind: "availability" as const,
  },
  { id: "workload", type: "status" as const, statusKind: "workload" as const },
];

export interface TeamPeopleViewProps {
  rows: TeamPeopleRow[];
  onOpenPerson: (personId: string, tab?: PersonDrawerTab) => void;
}

export function TeamPeopleView({ rows, onOpenPerson }: TeamPeopleViewProps) {
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  const getValue = useMemo(
    () => (row: TeamPeopleRow, columnId: string) => {
      switch (columnId) {
        case "person":
          return row.personName || row.personId;
        case "efficiency":
          return row.efficiency;
        case "attention":
          return row.attentionSeverityLabel;
        case "availability":
          return row.availability;
        case "workload":
          return row.workload;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(rows, PEOPLE_COLUMNS, getValue);

  return (
    <section aria-label="People" data-testid="team-people-view">
      <p className="performance-section-desc">{performanceHelp.people}</p>
      <div className="performance-table-wrap">
        <table className="performance-table performance-table--interactive">
          <thead>
            <tr>
              <SortableTableHeader columnId="person" label="Person" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader
                columnId="efficiency"
                label="Efficiency"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
              <SortableTableHeader columnId="attention" label="Attention" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader columnId="availability" label="Availability" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader columnId="workload" label="Workload" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.personId}>
                <td>
                  <button
                    type="button"
                    className="performance-table__person-button performance-table__person-button--with-avatar"
                    onClick={() => onOpenPerson(row.personId)}
                  >
                    <PersonAvatar
                      personId={row.personId}
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
                        {row.attentionIssueKey && jiraBaseUrl ? (
                          <EntityLink
                            href={buildJiraIssueBrowseUrl(jiraBaseUrl, row.attentionIssueKey)}
                            mono
                            className="performance-people-attention__key"
                          >
                            {row.attentionIssueKey}
                          </EntityLink>
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

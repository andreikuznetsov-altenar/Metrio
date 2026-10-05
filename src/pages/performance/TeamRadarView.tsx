import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { EntityLink } from "../../components/EntityLink/EntityLink";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { resolveJiraBaseUrl } from "../../config/product";
import type { TeamRadarRow } from "../../domain/performance";
import type { RadarPrimaryAction } from "../../domain/radar/types";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { loadPreferences } from "../../platform/preferences";
import type { PersonDrawerTab } from "../../app/performanceAnalyticsContext";

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

function drawerTabForRadarAction(action: RadarPrimaryAction): PersonDrawerTab {
  if (action === "review_workload" || action === "review_tasks") {
    return "work";
  }
  return "overview";
}

export interface TeamRadarViewProps {
  rows: TeamRadarRow[];
  onOpenPerson: (personId: string, tab?: PersonDrawerTab) => void;
}

export function TeamRadarView({ rows, onOpenPerson }: TeamRadarViewProps) {
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

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
          <p className="performance-empty__message">No active team risks.</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Radar" data-testid="team-radar-view">
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
                    className="performance-table__person-button performance-table__person-button--with-avatar"
                    onClick={() => onOpenPerson(row.personId, "overview")}
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
                    </span>
                  </button>
                </td>
                <td className="performance-table__reason">
                  <div className="performance-radar-reason">
                    {row.primaryIssueKey && jiraBaseUrl ? (
                      <EntityLink
                        href={buildJiraIssueBrowseUrl(jiraBaseUrl, row.primaryIssueKey)}
                        mono
                      >
                        {row.primaryIssueKey}
                      </EntityLink>
                    ) : null}
                    <span className="performance-radar-reason__detail">
                      {row.reasonDetail}
                    </span>
                  </div>
                </td>
                <td className="performance-table__num">{row.tasksAffected}</td>
                <td>
                  <Button
                    type="button"
                    variant="secondary"
                    className="performance-table__radar-action"
                    onClick={() =>
                      onOpenPerson(row.personId, drawerTabForRadarAction(row.primaryAction))
                    }
                  >
                    {row.action}
                  </Button>
                </td>
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

import { useMemo } from "react";
import type { OrganizationTeamRow } from "../../../domain/organization/organizationTypes";
import { Button } from "../../../components/Button/Button";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../../../components/Table/MetrioTable";
import { SortableTableHeader } from "../../../components/Table/SortableTableHeader";
import { useTableSort } from "../../../components/Table/useTableSort";

const TEAM_COLUMNS = [
  { id: "team", type: "text" as const },
  { id: "people", type: "number" as const },
  { id: "active", type: "number" as const },
  { id: "attention", type: "number" as const },
  { id: "completed", type: "number" as const },
  { id: "firstPass", type: "number" as const },
  { id: "avgCycle", type: "duration" as const },
  { id: "leave", type: "number" as const },
];

export interface DirectorTeamsViewProps {
  teams: OrganizationTeamRow[];
  selectedTeamId?: string;
  onSelectTeam: (teamId: string) => void;
  onBack: () => void;
}

export function DirectorTeamsView({
  teams,
  selectedTeamId,
  onSelectTeam,
  onBack,
}: DirectorTeamsViewProps) {
  const getValue = useMemo(
    () => (row: OrganizationTeamRow, columnId: string) => {
      switch (columnId) {
        case "team":
          return row.teamName;
        case "people":
          return row.peopleCount;
        case "active":
          return row.activeWork;
        case "attention":
          return row.attentionCount;
        case "completed":
          return row.completed;
        case "firstPass":
          return row.firstPassPercent;
        case "avgCycle":
          return row.avgCycleLabel;
        case "leave":
          return row.upcomingLeave;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(teams, TEAM_COLUMNS, getValue);

  const selected = teams.find((team) => team.teamId === selectedTeamId);

  if (selected) {
    return (
      <div data-testid="director-team-detail">
        <Button variant="ghost" onClick={onBack}>
          ← All teams
        </Button>
        <h3 className="performance-section__title">{selected.teamName}</h3>
        <dl className="performance-director-team-meta">
          <div>
            <dt>People</dt>
            <dd>{selected.peopleCount}</dd>
          </div>
          <div>
            <dt>Active work</dt>
            <dd>{selected.activeWork}</dd>
          </div>
          <div>
            <dt>Attention</dt>
            <dd>{selected.attentionCount}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{selected.completed}</dd>
          </div>
          <div>
            <dt>First pass</dt>
            <dd>{selected.firstPassPercent}%</dd>
          </div>
          <div>
            <dt>Avg cycle</dt>
            <dd>{selected.avgCycleLabel}</dd>
          </div>
          <div>
            <dt>Upcoming leave</dt>
            <dd>{selected.upcomingLeave}</dd>
          </div>
        </dl>
        <p className="performance-inline-empty">
          Open Radar, Delivery Risk, and People from Signals or Delivery for this team.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="director-teams">
      <MetrioTableWrap>
        <table className={METRIO_TABLE_CLASS}>
          <thead>
            <tr>
              <SortableTableHeader columnId="team" label="Team" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader
                columnId="people"
                label="People"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
              <SortableTableHeader
                columnId="active"
                label="Active work"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
              <SortableTableHeader
                columnId="attention"
                label="Attention"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
              <SortableTableHeader
                columnId="completed"
                label="Completed"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
              <SortableTableHeader
                columnId="firstPass"
                label="First pass"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
              <SortableTableHeader
                columnId="avgCycle"
                label="Avg cycle"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader
                columnId="leave"
                label="Upcoming leave"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((team) => (
              <tr
                key={team.teamId}
                className="performance-table__clickable-row"
                onClick={() => onSelectTeam(team.teamId)}
              >
                <td>{team.teamName}</td>
                <td className="performance-table__num">{team.peopleCount}</td>
                <td className="performance-table__num">{team.activeWork}</td>
                <td className="performance-table__num">{team.attentionCount}</td>
                <td className="performance-table__num">{team.completed}</td>
                <td className="performance-table__num">{team.firstPassPercent}%</td>
                <td>{team.avgCycleLabel}</td>
                <td className="performance-table__num">{team.upcomingLeave}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MetrioTableWrap>
    </div>
  );
}

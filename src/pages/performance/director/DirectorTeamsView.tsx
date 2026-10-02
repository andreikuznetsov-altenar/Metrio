import type { OrganizationTeamRow } from "../../../domain/organization/organizationTypes";
import { Button } from "../../../components/Button/Button";

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
    <div data-testid="director-teams" className="performance-table-wrap">
      <table className="performance-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>People</th>
            <th>Active work</th>
            <th>Attention</th>
            <th>Completed</th>
            <th>First pass</th>
            <th>Avg cycle</th>
            <th>Upcoming leave</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr
              key={team.teamId}
              className="performance-table__row--interactive"
              onClick={() => onSelectTeam(team.teamId)}
            >
              <td>{team.teamName}</td>
              <td>{team.peopleCount}</td>
              <td>{team.activeWork}</td>
              <td>{team.attentionCount}</td>
              <td>{team.completed}</td>
              <td>{team.firstPassPercent}%</td>
              <td>{team.avgCycleLabel}</td>
              <td>{team.upcomingLeave}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

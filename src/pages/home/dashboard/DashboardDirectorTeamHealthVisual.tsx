import type { HomeOrganizationWorkspace } from "../../../domain/home/homeTypes";
import { Button } from "../../../components/Button/Button";

export function DashboardDirectorTeamHealthVisual({
  organization,
  onOpenDirectorView,
}: {
  organization: HomeOrganizationWorkspace;
  onOpenDirectorView: () => void;
}) {
  const teams = organization.model.teams.slice(0, 5);
  if (!teams.length) return null;

  return (
    <section
      className="executive-panel executive-dashboard__span-6"
      aria-label="Organization team health"
      data-testid="dashboard-director-team-health"
    >
      <h2 className="executive-panel__title">Leadership branches</h2>
      <ul className="executive-director-teams">
        {teams.map((team) => (
          <li key={team.teamId} className="executive-director-teams__row">
            <span className="executive-director-teams__name">{team.teamName}</span>
            <span className="executive-director-teams__meta">
              {team.peopleCount} people · {team.activeWork} active · {team.attentionCount}{" "}
              attention
              {team.capacitySummaryLabel ? ` · ${team.capacitySummaryLabel}` : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="executive-secondary-line">
        {organization.teamsNeedingAttention} teams need attention · {organization.signalCount}{" "}
        org signals
      </p>
      <div className="home-card__actions">
        <Button type="button" variant="secondary" onClick={onOpenDirectorView}>
          Open director view
        </Button>
      </div>
    </section>
  );
}

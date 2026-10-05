import { Button } from "../../../components/Button/Button";

export interface DashboardTeamBriefCardProps {
  headline: string;
  detail: string;
  onOpen: () => void;
}

export function DashboardTeamBriefCard({
  headline,
  detail,
  onOpen,
}: DashboardTeamBriefCardProps) {
  return (
    <section
      className="executive-panel executive-dashboard__secondary-module"
      aria-label="Team brief"
      data-testid="dashboard-team-brief"
    >
      <h2 className="executive-panel__title">Team brief</h2>
      <p className="dashboard-digest-card__headline">{headline}</p>
      <p className="dashboard-digest-card__detail">{detail}</p>
      <div className="home-card__actions">
        <Button type="button" variant="secondary" onClick={onOpen}>
          Open team brief
        </Button>
      </div>
    </section>
  );
}

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
    <article className="executive-lower-card" aria-label="Team brief" data-testid="dashboard-team-brief">
      <h3 className="executive-lower-card__title">Team brief</h3>
      <p className="executive-lower-card__headline">{headline}</p>
      <p className="executive-lower-card__description">{detail}</p>
      <div className="executive-lower-card__cta">
        <Button type="button" variant="secondary" onClick={onOpen}>
          Open team brief
        </Button>
      </div>
    </article>
  );
}

import { ExternalLink } from "lucide-react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { formatGoalCardDateLine } from "../../domain/goals/goalDatePresentation";
import { resolveGoalPresentationStatus } from "../../domain/goals/goalPresentationHealth";
import { milestoneSummary } from "../../domain/goals/normalizeBambooGoal";

export function BambooGoalCard({
  goal,
  onOpen,
  onOpenInBamboo,
  onRequestDelete,
}: {
  goal: BambooGoal;
  onOpen: () => void;
  onOpenInBamboo: () => void;
  onRequestDelete: () => void;
}) {
  const milestones = milestoneSummary(goal);
  const presentation = resolveGoalPresentationStatus(goal);
  const dateLine = formatGoalCardDateLine(goal);
  return (
    <article
      className="goal-card goal-card--bamboo"
      data-testid="bamboo-goal-card"
      data-goal-id={goal.id}
    >
      <div className="goal-card__main">
        <div className="goal-card__content">
          <h3 className="goal-card__title">{goal.title}</h3>
          <p className="goal-card__dates" data-testid="bamboo-goal-card-dates">
            {dateLine}
          </p>
          <div className="goal-card__status-row">
            <Badge variant={presentation.badgeVariant}>{presentation.label}</Badge>
          </div>
          {milestones ? <p className="goal-card__facts">{milestones}</p> : null}
        </div>
        <div
          className="goal-card__progress"
          data-testid="bamboo-goal-card-percent"
          aria-label={`${goal.percentComplete} percent complete`}
        >
          {goal.percentComplete}%
        </div>
      </div>
      <div className="goal-card__actions">
        <Button
          type="button"
          variant="primary"
          onClick={onOpen}
          data-testid="bamboo-goal-open"
        >
          Open goal
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onOpenInBamboo}
          data-testid="bamboo-goal-open-in-bamboo"
        >
          <ExternalLink size={14} aria-hidden strokeWidth={1.75} />
          Open in Bamboo
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="goal-card__delete"
          onClick={onRequestDelete}
          data-testid="bamboo-goal-delete"
        >
          Delete
        </Button>
      </div>
    </article>
  );
}

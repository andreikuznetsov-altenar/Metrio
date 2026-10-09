import { ExternalLink } from "lucide-react";
import { Button } from "../../components/Button/Button";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { milestoneSummary } from "../../domain/goals/normalizeBambooGoal";

function formatStatus(goal: BambooGoal): string {
  switch (goal.status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "closed":
      return "Closed";
    default:
      return goal.rawStatus || "Unknown";
  }
}

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
  return (
    <article className="goal-card" data-testid="bamboo-goal-card" data-goal-id={goal.id}>
      <h3 className="goal-card__title">{goal.title}</h3>
      <p className="goal-card__meta">
        {goal.percentComplete}% · {goal.dueDate ? `Due ${goal.dueDate}` : "No due date"} ·{" "}
        {formatStatus(goal)}
      </p>
      {milestones ? <p className="goal-card__facts">{milestones}</p> : null}
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
          variant="danger"
          onClick={onRequestDelete}
          data-testid="bamboo-goal-delete"
        >
          Delete
        </Button>
      </div>
    </article>
  );
}

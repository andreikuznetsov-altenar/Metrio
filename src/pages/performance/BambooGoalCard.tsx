import { Button } from "../../components/Button/Button";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { milestoneSummary } from "../../domain/goals/normalizeBambooGoal";

export function BambooGoalCard({
  goal,
  onOpen,
}: {
  goal: BambooGoal;
  onOpen: () => void;
}) {
  const milestones = milestoneSummary(goal);
  return (
    <article className="goal-card" data-testid="bamboo-goal-card" data-goal-id={goal.id}>
      <h3 className="goal-card__title">{goal.title}</h3>
      <p className="goal-card__meta">
        {goal.percentComplete}% · {goal.dueDate ? `Due ${goal.dueDate}` : "No due date"} ·{" "}
        {goal.status.replace(/_/g, " ")}
      </p>
      {milestones ? <p className="goal-card__facts">{milestones}</p> : null}
      <Button type="button" variant="secondary" onClick={onOpen}>
        Open goal
      </Button>
    </article>
  );
}

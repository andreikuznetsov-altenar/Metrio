import { Button } from "../../components/Button/Button";
import { buildLinkedWorkContext } from "../../domain/goals/goalLinkedWork";
import { formatReviewDateLabel } from "../../domain/goals/goalReview";
import type { Goal } from "../../domain/goals/goalTypes";
import type { Person } from "../../domain/people/types";

export interface GoalCardProps {
  goal: Goal;
  person: Person | null;
  onOpen: () => void;
}

export function GoalCard({ goal, person, onOpen }: GoalCardProps) {
  const work = buildLinkedWorkContext(goal, person);
  const reviewLabel = goal.reviewDate
    ? `Review ${formatReviewDateLabel(goal.reviewDate)}`
    : null;

  return (
    <article className="goal-card" data-testid="goal-card">
      <h3 className="goal-card__title">{goal.title}</h3>
      {reviewLabel ? <p className="goal-card__meta">{reviewLabel}</p> : null}
      <p className="goal-card__linked">
        Linked work
        {work.issueKeysSample.length
          ? ` · ${work.issueKeysSample.slice(0, 2).join(", ")}`
          : ""}
      </p>
      <p className="goal-card__facts">
        {work.linkedIssueCount} linked
        {work.completedCount > 0 ? ` · ${work.completedCount} completed` : ""}
        {work.inReviewCount > 0 ? ` · ${work.inReviewCount} in review` : ""}
        {work.activeCount > 0 ? ` · ${work.activeCount} active` : ""}
      </p>
      {work.linkedWorkCompletionLabel ? (
        <p className="goal-card__facts">{work.linkedWorkCompletionLabel}</p>
      ) : null}
      <Button type="button" variant="secondary" onClick={onOpen}>
        Open goal
      </Button>
    </article>
  );
}

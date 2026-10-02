import type { CurrentUser } from "../domain/types";
import { listVisibleGoals } from "../domain/goals/goalAccess";
import { goalReviewMilestone } from "../domain/goals/goalReview";
import type { Goal } from "../domain/goals/goalTypes";
import { recordNotificationEvent } from "./notificationEvents";

export function syncGoalReviewNotifications(
  goals: Goal[],
  currentUser: CurrentUser,
  now = new Date(),
): void {
  const visible = listVisibleGoals(goals, currentUser);
  for (const goal of visible) {
    const milestone = goalReviewMilestone(goal, now);
    if (!milestone) continue;
    const label =
      milestone === "7d"
        ? "Goal review in 7 days"
        : milestone === "1d"
          ? "Goal review tomorrow"
          : milestone === "today"
            ? "Goal review today"
            : "Goal review overdue";

    recordNotificationEvent({
      type: "goal_review_due",
      title: label,
      message: goal.title,
      dedupeKey: `goal_review:${goal.id}:${milestone}`,
      personId: goal.ownerPersonId,
      target: { kind: "goal", goalId: goal.id },
      source: "metrio",
      actionRequired: false,
    });
  }
}

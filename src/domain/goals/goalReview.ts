import type { Goal } from "./goalTypes";

export type GoalReviewMilestone = "7d" | "1d" | "today" | "overdue";

export function parseLocalDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
  );
}

export function calendarDaysUntilReview(
  reviewDate: string,
  now = new Date(),
): number | null {
  const target = parseLocalDateKey(reviewDate);
  if (!target) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const end = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    12,
  );
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function goalReviewMilestone(
  goal: Goal,
  now = new Date(),
): GoalReviewMilestone | null {
  if (!goal.reviewDate || goal.status === "cancelled" || goal.status === "completed") {
    return null;
  }
  const days = calendarDaysUntilReview(goal.reviewDate, now);
  if (days == null) return null;
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "1d";
  if (days === 7) return "7d";
  return null;
}

export function goalNeedsDiscussion(goal: Goal, now = new Date()): boolean {
  const milestone = goalReviewMilestone(goal, now);
  return milestone === "overdue" || milestone === "today" || milestone === "1d";
}

export function formatReviewDateLabel(reviewDate: string): string {
  const parsed = parseLocalDateKey(reviewDate);
  if (!parsed) return reviewDate;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function summarizeGoalsForHome(
  goals: Goal[],
  now = new Date(),
): {
  activeCount: number;
  reviewApproachingCount: number;
  overdueReviewCount: number;
  needsAttention: boolean;
  nearestReviewLabel: string | null;
} {
  const active = goals.filter((g) => g.status === "active");
  const reviewApproaching = active.filter((g) => {
    const days = g.reviewDate
      ? calendarDaysUntilReview(g.reviewDate, now)
      : null;
    return days != null && days >= 0 && days <= 7;
  });
  const overdueReview = active.filter((g) => {
    const days = g.reviewDate
      ? calendarDaysUntilReview(g.reviewDate, now)
      : null;
    return days != null && days < 0;
  });

  let nearestReviewLabel: string | null = null;
  let nearestDays: number | null = null;
  for (const goal of active) {
    if (!goal.reviewDate) continue;
    const days = calendarDaysUntilReview(goal.reviewDate, now);
    if (days == null || days < 0) continue;
    if (nearestDays == null || days < nearestDays) {
      nearestDays = days;
      nearestReviewLabel = formatReviewDateLabel(goal.reviewDate);
    }
  }

  return {
    activeCount: active.length,
    reviewApproachingCount: reviewApproaching.length,
    overdueReviewCount: overdueReview.length,
    needsAttention: reviewApproaching.length > 0 || overdueReview.length > 0,
    nearestReviewLabel,
  };
}

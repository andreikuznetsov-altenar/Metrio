import { Button } from "../../components/Button/Button";
import { navigateOpenGoals } from "../../app/ctaRouting";
import type { summarizeGoalsForHome } from "../../domain/goals/goalReview";

type GoalsSummary = ReturnType<typeof summarizeGoalsForHome>;

export function HomeGoalsSummaryCard({
  teamView,
  summary,
  prominent = false,
  moduleSurface = "default",
}: {
  teamView: boolean;
  summary: GoalsSummary;
  prominent?: boolean;
  moduleSurface?: "default" | "secondary" | "lower-card";
}) {
  const openGoals = () => {
    navigateOpenGoals({ teamView });
  };

  const attentionLine =
    summary.overdueReviewCount > 0
      ? `${summary.overdueReviewCount} review${summary.overdueReviewCount === 1 ? "" : "s"} overdue.`
      : summary.reviewApproachingCount > 0
        ? `${summary.reviewApproachingCount} review${summary.reviewApproachingCount === 1 ? "" : "s"} in the next 7 days.`
        : null;

  const surfaceClass =
    moduleSurface === "lower-card"
      ? "executive-lower-card"
      : moduleSurface === "secondary"
        ? "executive-panel executive-dashboard__secondary-module"
        : `home-card${prominent ? " home-card--goals-alert" : ""}`;
  const titleClass =
    moduleSurface === "lower-card"
      ? "executive-lower-card__title"
      : moduleSurface === "secondary"
        ? "executive-panel__title"
        : "home-card__title home-card__title--section";
  const headlineClass =
    moduleSurface === "lower-card"
      ? "executive-lower-card__headline"
      : "dashboard-digest-card__headline";
  const detailClass =
    moduleSurface === "lower-card"
      ? "executive-lower-card__description"
      : "dashboard-digest-card__detail";
  const actionsClass =
    moduleSurface === "lower-card" ? "executive-lower-card__cta" : "home-card__actions";

  return (
    <section
      className={surfaceClass}
      aria-label="Goals"
      data-testid="home-goals-summary"
      data-prominent={prominent ? "true" : "false"}
    >
      <h2 className={titleClass}>
        {teamView ? "Goal reviews" : "Goals"}
      </h2>
      {attentionLine ? (
        <p className={moduleSurface === "lower-card" ? "executive-lower-card__headline" : "home-card__lead"}>
          {attentionLine}
        </p>
      ) : (
        <p className={headlineClass}>
          {summary.activeCount} active goal
          {summary.activeCount === 1 ? "" : "s"}
        </p>
      )}
      <p className={detailClass}>
        {teamView
          ? "Review active goals and upcoming review dates."
          : "Track progress on your active goals and review dates."}
        {summary.nearestReviewLabel
          ? ` Next review: ${summary.nearestReviewLabel}.`
          : ""}
      </p>
      <div className={actionsClass}>
        <Button variant="secondary" onClick={openGoals}>
          Open goals
        </Button>
      </div>
    </section>
  );
}

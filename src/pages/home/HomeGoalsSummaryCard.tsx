import { Button } from "../../components/Button/Button";
import {
  dispatchAppRoute,
  dispatchEmployeeView,
} from "../../app/actionNavigation";
import type { summarizeGoalsForHome } from "../../domain/goals/goalReview";

type GoalsSummary = ReturnType<typeof summarizeGoalsForHome>;

export function HomeGoalsSummaryCard({
  teamView,
  summary,
  prominent = false,
}: {
  teamView: boolean;
  summary: GoalsSummary;
  prominent?: boolean;
}) {
  const openGoals = () => {
    dispatchAppRoute("performance");
    if (teamView) {
      window.dispatchEvent(
        new CustomEvent("metrio-open-performance-tab", {
          detail: "goals",
        }),
      );
    } else {
      dispatchEmployeeView("goals");
    }
  };

  const attentionLine =
    summary.overdueReviewCount > 0
      ? `${summary.overdueReviewCount} review${summary.overdueReviewCount === 1 ? "" : "s"} overdue.`
      : summary.reviewApproachingCount > 0
        ? `${summary.reviewApproachingCount} review${summary.reviewApproachingCount === 1 ? "" : "s"} in the next 7 days.`
        : null;

  return (
    <section
      className={`home-card${prominent ? " home-card--goals-alert" : ""}`}
      aria-label="Goals"
      data-testid="home-goals-summary"
      data-prominent={prominent ? "true" : "false"}
    >
      <h2 className="home-card__title home-card__title--section">
        {teamView ? "Goal reviews" : "Goals"}
      </h2>
      {attentionLine ? (
        <p className="home-card__lead">{attentionLine}</p>
      ) : (
        <p className="dashboard-digest-card__headline">
          {summary.activeCount} active goal
          {summary.activeCount === 1 ? "" : "s"}
        </p>
      )}
      <p className="dashboard-digest-card__detail">
        {teamView
          ? "Review active goals and upcoming review dates."
          : "Track progress on your active goals and review dates."}
        {summary.nearestReviewLabel
          ? ` Next review: ${summary.nearestReviewLabel}.`
          : ""}
      </p>
      <div className="home-card__actions">
        <Button variant="secondary" onClick={openGoals}>
          Open goals
        </Button>
      </div>
    </section>
  );
}

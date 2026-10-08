import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";
import { navigatePerformanceView } from "./actionNavigation";

export interface ProductRecommendationNavigationHandlers {
  openPerson: (personId: string) => void;
  openJira: (issueKey: string) => void;
  openTeamWorkload?: () => void;
  /** Preferred Performance drilldown when issueKeys are known. */
  openIssueList?: (issueKeys: string[], title: string) => void;
}

export function navigateProductRecommendation(
  recommendation: ProductRecommendation,
  handlers: ProductRecommendationNavigationHandlers,
): void {
  switch (recommendation.actionKind) {
    case "view_person":
      if (recommendation.personId) {
        handlers.openPerson(recommendation.personId);
      }
      return;
    case "open_jira":
      if (recommendation.issueKey) {
        handlers.openJira(recommendation.issueKey);
      }
      return;
    case "open_delivery_risk":
      navigatePerformanceView("delivery-risk");
      return;
    case "open_performance":
      navigatePerformanceView("overview");
      return;
    case "open_team_workload":
      handlers.openTeamWorkload?.();
      return;
    case "review_issues":
      if (recommendation.issueKeys?.length) {
        handlers.openIssueList?.(
          recommendation.issueKeys,
          recommendation.title,
        );
      }
      return;
    case "open_history_reports":
      navigatePerformanceView("history-reports");
      return;
    default:
      return;
  }
}

import type { OrgFeatureAccess } from "./orgFeatureAccess";

type FeedbackNotificationTab =
  | "survey"
  | "delivery"
  | "results"
  | "history"
  | "cycles";

/**
 * Maps notification / deep-link feedback tabs to a role-safe tab, or null when Feedback is unavailable.
 */
export function resolveSafeFeedbackNotificationTab(
  tab: FeedbackNotificationTab,
  access: OrgFeatureAccess,
): FeedbackNotificationTab | null {
  if (!access.showFeedbackTab) {
    return null;
  }
  if (!access.canViewSurveyManagement) {
    return access.canViewOwnFeedbackResults ? "results" : null;
  }
  if (tab === "results" && access.canViewOwnFeedbackResults) {
    return tab;
  }
  return "cycles";
}

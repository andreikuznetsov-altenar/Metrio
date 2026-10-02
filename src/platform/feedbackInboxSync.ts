import type { FeedbackActionSummary } from "../domain/feedback/feedbackActionSummary";
import {
  recordNotificationEvent,
  resolveNotificationByDedupeKey,
} from "./notificationEvents";

const DELIVERY_FAILURE_KEY = "feedback:delivery-failures";
const SURVEY_READY_KEY = "feedback:survey-ready";

export function syncFeedbackInboxFromSummary(summary: FeedbackActionSummary): void {
  if (summary.deliveryFailureCount > 0) {
    recordNotificationEvent({
      type: "feedback_action",
      title: "Survey delivery failed",
      message: `${summary.deliveryFailureCount} delivery failure${summary.deliveryFailureCount === 1 ? "" : "s"} need attention`,
      dedupeKey: DELIVERY_FAILURE_KEY,
      target: { kind: "feedback", tab: "delivery" },
      actionRequired: true,
    });
  } else {
    resolveNotificationByDedupeKey(DELIVERY_FAILURE_KEY);
  }

  if (summary.preparedNotSent) {
    recordNotificationEvent({
      type: "feedback_action",
      title: "Survey ready to send",
      message: "A prepared survey is awaiting send",
      dedupeKey: SURVEY_READY_KEY,
      target: { kind: "feedback", tab: "survey" },
      actionRequired: true,
    });
  } else {
    resolveNotificationByDedupeKey(SURVEY_READY_KEY);
  }
}

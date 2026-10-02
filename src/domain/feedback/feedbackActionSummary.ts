import type { SurveyDataFile } from "../survey/types";

export interface FeedbackActionSummary {
  preparedNotSent: boolean;
  pendingResponseCount: number;
  deliveryFailureCount: number;
}

export function summarizeFeedbackActions(data: SurveyDataFile | null | undefined): FeedbackActionSummary {
  if (!data?.surveys?.length) {
    return {
      preparedNotSent: false,
      pendingResponseCount: 0,
      deliveryFailureCount: 0,
    };
  }

  const latest = data.surveys[data.surveys.length - 1];
  if (!latest) {
    return {
      preparedNotSent: false,
      pendingResponseCount: 0,
      deliveryFailureCount: 0,
    };
  }

  const preparedNotSent = latest.status === "prepared" || latest.status === "ready";
  const pendingResponseCount = latest.recipients.filter(
    (r) => r.status === "sent" && !r.respondedAt,
  ).length;
  const deliveryFailureCount = latest.recipients.filter((r) => r.status === "failed").length;

  return {
    preparedNotSent,
    pendingResponseCount,
    deliveryFailureCount,
  };
}

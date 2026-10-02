import type { SurveyDataFile } from "../survey/types";
import { responseProgress } from "../feedbackCycles/runComparison";

export interface FeedbackActionSummary {
  preparedNotSent: boolean;
  pendingResponseCount: number;
  deliveryFailureCount: number;
  activeCycleProgress?: string;
  feedbackRequestedCount: number;
}

export function summarizeFeedbackActions(data: SurveyDataFile | null | undefined): FeedbackActionSummary {
  if (!data?.surveys?.length) {
    return {
      preparedNotSent: false,
      pendingResponseCount: 0,
      deliveryFailureCount: 0,
      feedbackRequestedCount: 0,
    };
  }

  const latest = data.surveys[data.surveys.length - 1];
  if (!latest) {
    return {
      preparedNotSent: false,
      pendingResponseCount: 0,
      deliveryFailureCount: 0,
      feedbackRequestedCount: 0,
    };
  }

  const preparedNotSent = latest.status === "prepared" || latest.status === "ready";
  const pendingResponseCount = latest.recipients.filter(
    (r) => r.status === "sent" && !r.respondedAt,
  ).length;
  const deliveryFailureCount = latest.recipients.filter((r) => r.status === "failed").length;

  const activeCycle = (data.cycles ?? []).find((c) => c.status === "active" && c.currentRunId);
  const cycleRun = activeCycle
    ? data.surveys.find((s) => s.id === activeCycle.currentRunId)
    : null;
  const progress = cycleRun ? responseProgress(cycleRun) : null;

  const feedbackRequestedCount = data.surveys
    .flatMap((s) => s.recipients)
    .filter((r) => r.selected && r.status === "sent" && !r.respondedAt).length;

  return {
    preparedNotSent,
    pendingResponseCount,
    deliveryFailureCount,
    activeCycleProgress:
      progress && progress.total > 0
        ? `${progress.responded}/${progress.total} responses`
        : undefined,
    feedbackRequestedCount,
  };
}

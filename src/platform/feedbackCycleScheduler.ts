import { evaluateFeedbackCycles } from '../domain/feedbackCycles/feedbackCycleEngine';
import type { SurveyDataFile } from '../domain/survey/types';
import { recordNotificationEvent } from './notificationEvents';

export function runFeedbackCycleScheduler(
  data: SurveyDataFile,
  now = new Date(),
): SurveyDataFile {
  const { data: next, createdRunIds } = evaluateFeedbackCycles(data, now);
  for (const runId of createdRunIds) {
    const run = next.surveys.find((s) => s.id === runId);
    const cycle = next.cycles?.find((c) => c.id === run?.cycleId);
    recordNotificationEvent({
      type: 'feedback_cycle_due',
      title: 'Feedback cycle ready',
      message: cycle?.name ?? 'A new feedback run was scheduled.',
      dedupeKey: `feedback_cycle_due:${run?.periodKey ?? runId}`,
      target: { kind: 'feedback', tab: 'cycles' },
      source: 'feedback',
      actionRequired: false,
    });
  }
  return next;
}

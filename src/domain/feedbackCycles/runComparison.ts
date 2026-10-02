import type { Survey, SurveyQuestion } from '../survey/types';
import type { FeedbackSurveyTemplate } from './feedbackCycleTypes';

export interface ComparableRunSummary {
  runId: string;
  periodLabel: string;
  respondedCount: number;
  sentCount: number;
  templateVersion: number | null;
}

export function runsForCycle(surveys: Survey[], cycleId: string): Survey[] {
  return surveys
    .filter((s) => s.cycleId === cycleId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function areQuestionsComparable(
  a: SurveyQuestion[],
  b: SurveyQuestion[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].type !== b[i].type) return false;
    if (a[i].id !== b[i].id && a[i].title !== b[i].title) return false;
  }
  return true;
}

export function comparableRunChain(
  runs: Survey[],
  template: FeedbackSurveyTemplate | null,
): Survey[] {
  if (runs.length <= 1) return runs;
  const baseline = runs[0].questions;
  return runs.filter((run, index) => {
    if (index === 0) return true;
    if (template && run.templateVersion !== runs[0].templateVersion) {
      return false;
    }
    return areQuestionsComparable(baseline, run.questions);
  });
}

export function responseProgress(run: Survey): { responded: number; total: number } {
  const selected = run.recipients.filter((r) => r.selected);
  const total = selected.length;
  const responded = selected.filter((r) => r.status === 'responded').length;
  return { responded, total };
}

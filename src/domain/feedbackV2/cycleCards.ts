import type { Survey } from '../survey/types';
import type { FeedbackCycle } from '../feedbackCycles/feedbackCycleTypes';
import { responseProgress, runsForCycle, areQuestionsComparable } from '../feedbackCycles/runComparison';
import { formatRecipientPreview } from './recipients';
import { deriveRunPhase, cycleStatusFromRuns, runStatusLabel } from './runStatus';
import { averageScaleScoreForRun } from './trends';

export interface FeedbackCycleCardModel {
  cycleId: string;
  title: string;
  recipientPreview: string;
  questionCount: number;
  responsesLabel: string;
  averageScore: string | null;
  statusLabel: string;
  trendLabel: string | null;
  currentRunId: string | null;
  currentRunPhase: ReturnType<typeof deriveRunPhase> | null;
}

export function buildCycleCardModel(
  cycle: FeedbackCycle,
  surveys: Survey[],
): FeedbackCycleCardModel {
  const runs = runsForCycle(surveys, cycle.id);
  const current =
    runs.find((r) => r.id === cycle.currentRunId) ?? runs[runs.length - 1] ?? null;
  const progress = current ? responseProgress(current) : { responded: 0, total: 0 };
  const sent = current
    ? current.recipients.filter((r) => r.selected && (r.status === 'sent' || r.status === 'responded'))
        .length
    : 0;
  const totalRecipients = current
    ? current.recipients.filter((r) => r.selected).length
    : 0;

  let trendLabel: string | null = null;
  if (runs.length >= 2) {
    const a = runs[runs.length - 2];
    const b = runs[runs.length - 1];
    if (areQuestionsComparable(a.questions, b.questions)) {
      const scoreA = averageScaleScoreForRun(a);
      const scoreB = averageScaleScoreForRun(b);
      if (scoreA != null && scoreB != null) {
        const delta = scoreB - scoreA;
        const sign = delta > 0 ? '+' : '';
        trendLabel = `${sign}${delta.toFixed(1)} avg vs prior run`;
      }
    }
  }

  const cycleStatus = cycleStatusFromRuns(runs);
  const statusLabel =
    current && deriveRunPhase(current) === 'active'
      ? runStatusLabel('active')
      : cycleStatus === 'completed'
        ? 'Completed'
        : cycleStatus === 'active'
          ? 'Active'
          : 'Draft';

  return {
    cycleId: cycle.id,
    title: current?.title || cycle.name,
    recipientPreview: current ? formatRecipientPreview(current.recipients) : '—',
    questionCount: current?.questions.filter((q) => q.active).length ?? 0,
    responsesLabel: `${progress.responded} / ${Math.max(totalRecipients, sent, progress.total)}`,
    averageScore:
      current && averageScaleScoreForRun(current) != null
        ? `${averageScaleScoreForRun(current)!.toFixed(1)}`
        : null,
    statusLabel,
    trendLabel,
    currentRunId: current?.id ?? null,
    currentRunPhase: current ? deriveRunPhase(current) : null,
  };
}

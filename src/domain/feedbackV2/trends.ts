import type { Survey, SurveyQuestion } from '../survey/types';
import { runsForCycle, areQuestionsComparable } from '../feedbackCycles/runComparison';

function scaleQuestions(questions: SurveyQuestion[]): SurveyQuestion[] {
  return questions.filter((q) => q.active && q.type === 'scale');
}

function parseScaleValue(raw: string): number | null {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export function averageScaleScoreForRun(run: Survey): number | null {
  const scales = scaleQuestions(run.questions);
  if (!scales.length || !run.responses.length) return null;
  const values: number[] = [];
  for (const response of run.responses) {
    for (const answer of response.answers) {
      const question = scales.find((q) => q.id === answer.questionId);
      if (!question) continue;
      const value = parseScaleValue(answer.value);
      if (value != null) values.push(value);
    }
  }
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export interface QuestionTrendPoint {
  questionId: string;
  title: string;
  runId: string;
  runLabel: string;
  average: number | null;
}

export function buildQuestionTrends(cycleId: string, surveys: Survey[]): QuestionTrendPoint[] {
  const runs = runsForCycle(surveys, cycleId);
  if (runs.length < 2) return [];
  const baseline = runs[0].questions;
  const comparable = runs.filter((run, index) => {
    if (index === 0) return true;
    return areQuestionsComparable(baseline, run.questions);
  });
  if (comparable.length < 2) return [];

  const points: QuestionTrendPoint[] = [];
  for (const question of scaleQuestions(baseline)) {
    for (const run of comparable) {
      const match = run.questions.find((q) => q.id === question.id);
      if (!match) continue;
      const values = run.responses.flatMap((response) =>
        response.answers
          .filter((a) => a.questionId === question.id)
          .map((a) => parseScaleValue(a.value))
          .filter((v): v is number => v != null),
      );
      const average = values.length
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : null;
      points.push({
        questionId: question.id,
        title: question.title,
        runId: run.id,
        runLabel: new Date(run.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        average,
      });
    }
  }
  return points;
}

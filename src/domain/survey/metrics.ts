import type { SurveyQuestion, SurveyResponse } from './types';

export type SurveyIndexStatus = 'Excellent' | 'Healthy' | 'Watch' | 'Risk' | 'Critical';

/** Port of legacy applySurveyIndexStatusStyle_ thresholds */
export function applySurveyIndexStatus(score: number): SurveyIndexStatus {
  const value = Number(score || 0);
  if (value >= 90) return 'Excellent';
  if (value >= 75) return 'Healthy';
  if (value >= 60) return 'Watch';
  if (value >= 40) return 'Risk';
  return 'Critical';
}

/** Port of legacy applyYesRateStatusStyle_ thresholds */
export function applyYesRateStatus(percent: number): SurveyIndexStatus {
  return applySurveyIndexStatus(percent);
}

export function normalizeScaleScore(avg: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.round(((avg - min) / (max - min)) * 10000) / 100;
}

export interface ScaleQuestionMetric {
  questionId: string;
  title: string;
  average: number;
  min: number;
  max: number;
  responseCount: number;
  normalizedIndex: number;
  status: SurveyIndexStatus;
}

export interface MultipleChoiceMetric {
  questionId: string;
  title: string;
  yesRatePercent: number;
  responseCount: number;
  status: SurveyIndexStatus;
}

export interface SurveyMetricsSummary {
  respondentCount: number;
  scaleQuestions: ScaleQuestionMetric[];
  multipleQuestions: MultipleChoiceMetric[];
  overallEffectivenessIndex: number;
  overallStatus: SurveyIndexStatus;
}

function normalizeYes(value: string): boolean {
  const n = String(value || '').trim().toLowerCase();
  return n === 'yes' || n === 'yeah' || n === 'y' || n === 'true' || n === 'да';
}

function findAnswerValue(
  response: SurveyResponse,
  question: SurveyQuestion,
): string | null {
  const match = response.answers.find(
    (a) =>
      a.questionId === question.id ||
      (question.googleQuestionId &&
        (a.googleQuestionId === question.googleQuestionId ||
          a.questionId === question.googleQuestionId)) ||
      a.questionTitle === question.title,
  );
  return match?.value ?? null;
}

export function buildSurveyMetricsSummary(
  questions: SurveyQuestion[],
  responses: SurveyResponse[],
): SurveyMetricsSummary {
  const activeQuestions = questions.filter((q) => q.active && q.title.trim());
  const scaleQuestions = activeQuestions.filter((q) => q.type === 'scale');
  const multipleQuestions = activeQuestions.filter((q) => q.type === 'multiple');

  const scaleMetrics: ScaleQuestionMetric[] = [];
  const normalizedScores: number[] = [];

  for (const q of scaleQuestions) {
    const parts = String(q.options || '1|5')
      .split('|')
      .map((v) => Number(String(v).trim()));
    const min = Number(parts[0] || 1);
    const max = Number(parts[1] || 5);

    const numericAnswers = responses
      .map((r) => findAnswerValue(r, q))
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));

    if (!numericAnswers.length || max === min) continue;

    const avg =
      numericAnswers.reduce((sum, v) => sum + v, 0) / numericAnswers.length;
    const normalized = normalizeScaleScore(avg, min, max);
    normalizedScores.push(normalized);

    scaleMetrics.push({
      questionId: q.id,
      title: q.title,
      average: Math.round(avg * 100) / 100,
      min,
      max,
      responseCount: numericAnswers.length,
      normalizedIndex: normalized,
      status: applySurveyIndexStatus(normalized),
    });
  }

  const multipleMetrics: MultipleChoiceMetric[] = [];

  for (const q of multipleQuestions) {
    const answers = responses
      .map((r) => findAnswerValue(r, q))
      .filter((v) => String(v || '').trim());

    if (!answers.length) continue;

    const yesCount = answers.filter((v) => normalizeYes(v!)).length;
    const yesRate = Math.round((yesCount / answers.length) * 10000) / 100;

    multipleMetrics.push({
      questionId: q.id,
      title: q.title,
      yesRatePercent: yesRate,
      responseCount: answers.length,
      status: applyYesRateStatus(yesRate),
    });
  }

  const overallEffectivenessIndex = normalizedScores.length
    ? Math.round(
        (normalizedScores.reduce((sum, v) => sum + v, 0) / normalizedScores.length) * 100,
      ) / 100
    : 0;

  return {
    respondentCount: responses.length,
    scaleQuestions: scaleMetrics,
    multipleQuestions: multipleMetrics,
    overallEffectivenessIndex,
    overallStatus: applySurveyIndexStatus(overallEffectivenessIndex),
  };
}

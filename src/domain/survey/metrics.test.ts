import { describe, expect, it } from 'vitest';
import {
  applySurveyIndexStatus,
  applyYesRateStatus,
  buildSurveyMetricsSummary,
  normalizeScaleScore,
} from './metrics';
import type { SurveyQuestion, SurveyResponse } from './types';

describe('survey metrics legacy parity', () => {
  it('normalizes scale scores using legacy formula', () => {
    expect(normalizeScaleScore(4, 1, 5)).toBe(75);
  });

  it('applies legacy index status thresholds', () => {
    expect(applySurveyIndexStatus(92)).toBe('Excellent');
    expect(applySurveyIndexStatus(80)).toBe('Healthy');
    expect(applySurveyIndexStatus(65)).toBe('Watch');
    expect(applySurveyIndexStatus(45)).toBe('Risk');
    expect(applySurveyIndexStatus(20)).toBe('Critical');
  });

  it('applies legacy yes-rate thresholds', () => {
    expect(applyYesRateStatus(83)).toBe('Healthy');
  });

  it('builds overall effectiveness from scale questions', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q1',
        googleQuestionId: 'google-q1',
        active: true,
        type: 'scale',
        title: 'Communication',
        options: '1|5',
        helpText: '',
        required: false,
      },
    ];
    const responses: SurveyResponse[] = [
      {
        responseId: '1',
        createTime: '2025-01-01',
        lastSubmittedTime: '2025-01-01',
        answers: [{
          questionId: 'q1',
          googleQuestionId: 'google-q1',
          questionTitle: 'Communication',
          value: '4',
        }],
      },
      {
        responseId: '2',
        createTime: '2025-01-02',
        lastSubmittedTime: '2025-01-02',
        answers: [{
          questionId: 'q1',
          googleQuestionId: 'google-q1',
          questionTitle: 'Communication',
          value: '5',
        }],
      },
    ];
    const summary = buildSurveyMetricsSummary(questions, responses);
    expect(summary.overallEffectivenessIndex).toBe(87.5);
    expect(summary.scaleQuestions[0].responseCount).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import { applyGoogleQuestionIds } from './questionMapping';
import { mapGoogleFormResponse } from './responses';
import { buildSurveyMetricsSummary } from './metrics';
import type { SurveyQuestion } from './types';

describe('response/question mapping e2e fixture', () => {
  it('maps google answer ids to local questions and computes metrics', () => {
    const localQuestions: SurveyQuestion[] = [
      {
        id: 'local-A',
        googleQuestionId: null,
        active: true,
        type: 'scale',
        title: 'Communication quality',
        options: '1|5',
        helpText: '',
        required: true,
      },
      {
        id: 'local-B',
        googleQuestionId: null,
        active: true,
        type: 'multiple',
        title: 'Would recommend',
        options: 'Yes|No',
        helpText: '',
        required: false,
      },
    ];

    const batchResponse = {
      replies: [
        { createItem: { questionItem: { question: { questionId: 'google-X' } } } },
        { createItem: { questionItem: { question: { questionId: 'google-Y' } } } },
      ],
    };

    const mappedQuestions = applyGoogleQuestionIds(localQuestions, batchResponse, [
      { localQuestionId: 'local-A', requestIndex: 0 },
      { localQuestionId: 'local-B', requestIndex: 1 },
    ]);

    expect(mappedQuestions[0].googleQuestionId).toBe('google-X');
    expect(mappedQuestions[1].googleQuestionId).toBe('google-Y');

    const response = mapGoogleFormResponse(
      {
        responseId: 'resp-1',
        createTime: '2025-03-01T10:00:00Z',
        lastSubmittedTime: '2025-03-01T10:05:00Z',
        answers: {
          'google-X': { value: 4 },
          'google-Y': { textAnswers: [{ value: 'Yes' }] },
        },
      },
      mappedQuestions,
    );

    expect(response.answers[0].questionTitle).toBe('Communication quality');
    expect(response.answers[1].questionTitle).toBe('Would recommend');

    const summary = buildSurveyMetricsSummary(mappedQuestions, [response]);
    expect(summary.scaleQuestions[0]?.average).toBe(4);
    expect(summary.multipleQuestions[0]?.yesRatePercent).toBe(100);
    expect(summary.overallEffectivenessIndex).toBeGreaterThan(0);
  });
});

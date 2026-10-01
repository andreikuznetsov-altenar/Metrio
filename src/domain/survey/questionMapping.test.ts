import { describe, expect, it } from 'vitest';
import { applyGoogleQuestionIds, resolveLocalQuestion } from './questionMapping';
import type { SurveyQuestion } from './types';
import { buildSurveyMetricsSummary } from './metrics';
import type { SurveyResponse } from './types';

describe('google question id mapping', () => {
  const questions: SurveyQuestion[] = [
    {
      id: 'local-a',
      googleQuestionId: null,
      active: true,
      type: 'scale',
      title: 'Communication',
      options: '1|5',
      helpText: '',
      required: true,
    },
    {
      id: 'local-b',
      googleQuestionId: null,
      active: true,
      type: 'multiple',
      title: 'Would recommend',
      options: 'Yes|No',
      helpText: '',
      required: false,
    },
  ];

  it('maps createItem replies to local question ids', () => {
    const batchResponse = {
      replies: [
        { createItem: { questionItem: { question: { questionId: 'google-x' } } } },
        { createItem: { questionItem: { question: { questionId: 'google-y' } } } },
      ],
    };

    const mapped = applyGoogleQuestionIds(questions, batchResponse, [
      { localQuestionId: 'local-a', requestIndex: 0 },
      { localQuestionId: 'local-b', requestIndex: 1 },
    ]);

    expect(mapped[0].googleQuestionId).toBe('google-x');
    expect(mapped[1].googleQuestionId).toBe('google-y');
    expect(mapped[0].id).toBe('local-a');
  });

  it('resolves responses through google ids when local ids differ', () => {
    const mappedQuestions = [
      { ...questions[0], googleQuestionId: 'google-x' },
      { ...questions[1], googleQuestionId: 'google-y' },
    ];

    const response: SurveyResponse = {
      responseId: 'r1',
      createTime: '2025-01-01T10:00:00Z',
      lastSubmittedTime: '2025-01-01T10:05:00Z',
      answers: [
        {
          questionId: 'local-a',
          googleQuestionId: 'google-x',
          questionTitle: 'Communication',
          value: '4',
        },
        {
          questionId: 'local-b',
          googleQuestionId: 'google-y',
          questionTitle: 'Would recommend',
          value: 'Yes',
        },
      ],
    };

    expect(resolveLocalQuestion('google-x', mappedQuestions)?.id).toBe('local-a');
    const summary = buildSurveyMetricsSummary(mappedQuestions, [response]);
    expect(summary.scaleQuestions[0]?.average).toBe(4);
    expect(summary.multipleQuestions[0]?.yesRatePercent).toBe(100);
  });
});

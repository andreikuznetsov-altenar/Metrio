import { describe, expect, it } from 'vitest';
import { mapGoogleFormResponse, responseSubmittedAt } from './responses';
import type { SurveyQuestion } from './types';

describe('response mapping', () => {
  const questions: SurveyQuestion[] = [
    {
      id: 'local-q1',
      googleQuestionId: 'google-q1',
      active: true,
      type: 'scale',
      title: 'Quality',
      options: '1|5',
      helpText: '',
      required: true,
    },
  ];

  it('maps google question ids to local question metadata', () => {
    const mapped = mapGoogleFormResponse(
      {
        responseId: 'r1',
        createTime: '2025-01-01T10:00:00Z',
        lastSubmittedTime: '2025-01-01T10:30:00Z',
        answers: {
          'google-q1': { value: 5 },
        },
      },
      questions,
    );

    expect(mapped.answers[0].questionId).toBe('local-q1');
    expect(mapped.answers[0].googleQuestionId).toBe('google-q1');
    expect(mapped.answers[0].questionTitle).toBe('Quality');
    expect('respondentEmail' in mapped).toBe(false);
  });

  it('uses real submission time from google response', () => {
    expect(
      responseSubmittedAt({
        lastSubmittedTime: '2025-02-01T08:15:22.123Z',
      }),
    ).toBe('2025-02-01T08:15:22.123Z');
  });
});

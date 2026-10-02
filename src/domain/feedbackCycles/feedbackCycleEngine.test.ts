import { describe, expect, it } from 'vitest';
import { evaluateFeedbackCycles } from './feedbackCycleEngine';
import { EMPTY_SURVEY_DATA } from '../../services/survey/surveyPersistence';
import type { FeedbackCycle } from './feedbackCycleTypes';

describe('feedbackCycleEngine', () => {
  it('does not duplicate runs for same period', () => {
    const cycle: FeedbackCycle = {
      id: 'cycle-1',
      name: 'Monthly pulse',
      type: 'pulse',
      status: 'active',
      cadence: { unit: 'monthly', timezone: 'local' },
      surveyTemplateId: 'tpl_team_pulse',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const data = {
      ...EMPTY_SURVEY_DATA,
      cycles: [cycle],
    };
    const first = evaluateFeedbackCycles(data, new Date(2026, 2, 5));
    expect(first.createdRunIds.length).toBe(1);
    const second = evaluateFeedbackCycles(first.data, new Date(2026, 2, 6));
    expect(second.createdRunIds.length).toBe(0);
  });
});

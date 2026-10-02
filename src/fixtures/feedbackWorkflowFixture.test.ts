import { describe, expect, it } from 'vitest';
import { feedbackWorkflowFixtureSummary } from './feedbackWorkflowFixture';

describe('feedbackWorkflowFixture', () => {
  it('documents mocked e2e step order without sending email', () => {
    expect(feedbackWorkflowFixtureSummary()).toContain('confirm_send');
    expect(feedbackWorkflowFixtureSummary()).toContain('history_contains_survey');
  });
});

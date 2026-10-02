import { describe, expect, it } from 'vitest';
import { applyFeedbackCyclesMigration, tagLegacySurveysAsRuns } from './migrateFeedbackData';
import { EMPTY_SURVEY_DATA } from '../../services/survey/surveyPersistence';

describe('migrateFeedbackData', () => {
  it('tags legacy surveys as runs', () => {
    const tagged = tagLegacySurveysAsRuns([
      {
        id: 's1',
        title: 'Old',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        dateFrom: '',
        dateTo: '',
        scope: 'direct',
        projects: [],
        emailSubject: '',
        introText: '',
        buttonLabel: '',
        signature: '',
        questions: [],
        recipients: [],
        responses: [],
        sendBatches: [],
        status: 'closed',
        questionsLocked: true,
        emailsSent: true,
        lastResponseSyncAt: null,
        error: null,
        googleFormId: null,
        responderUri: null,
      },
    ]);
    expect(tagged[0].periodKey).toContain('legacy');
    expect(tagged[0].confidentiality).toBe('identified');
  });

  it('applies templates on migration', () => {
    const migrated = applyFeedbackCyclesMigration({
      ...EMPTY_SURVEY_DATA,
      schemaVersion: 1,
    });
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.templates?.length).toBeGreaterThan(0);
  });
});

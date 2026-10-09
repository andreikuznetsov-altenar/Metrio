import { describe, expect, it } from 'vitest';
import { createDefaultSurveyData } from '../survey/defaults';
import type { Survey, SurveyDataFile } from '../survey/types';
import { stabilizeQuestionsForRepeat, semanticQuestionKey, createQuestionId } from './questionIdentity';
import { createCycleWithFirstRun, repeatCycleRun } from './operations';
import { deriveRunPhase } from './runStatus';
import { isFeedbackBridgeReady } from './bridgeReady';
import { DEFAULT_PREFERENCES } from '../../platform/preferences';

function surveyStub(id: string, cycleId: string): Survey {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    cycleId,
    googleFormId: 'form-1',
    responderUri: 'https://example.com',
    createdAt: now,
    updatedAt: now,
    dateFrom: '2026-01-01',
    dateTo: '2026-01-31',
    scope: 'direct',
    projects: [],
    title: 'Pulse',
    emailSubject: 'Subject',
    introText: 'Intro',
    buttonLabel: 'Open',
    signature: 'Thanks',
    questions: [
      {
        id: 'q_stable',
        googleQuestionId: 'g1',
        active: true,
        type: 'scale',
        title: 'Clarity',
        options: '1|5',
        helpText: '',
        required: true,
      },
    ],
    recipients: [],
    responses: [],
    sendBatches: [],
    status: 'active',
    questionsLocked: true,
    emailsSent: true,
    lastResponseSyncAt: null,
    error: null,
  };
}

describe('feedbackV2', () => {
  it('detects Apps Script bridge readiness', () => {
    expect(isFeedbackBridgeReady(DEFAULT_PREFERENCES)).toBe(false);
    expect(
      isFeedbackBridgeReady({
        ...DEFAULT_PREFERENCES,
        google: {
          ...DEFAULT_PREFERENCES.google,
          appsScriptWebAppUrl: 'https://script.google.com/macros/s/abc/exec',
          formsConnected: true,
          gmailConnected: true,
        },
      }),
    ).toBe(true);
  });

  it('keeps stable question ids on repeat when semantics match', () => {
    const prev = [
      {
        id: 'q_stable',
        googleQuestionId: 'g1',
        active: true,
        type: 'scale' as const,
        title: 'Clarity',
        options: '1|5',
        helpText: '',
        required: true,
      },
    ];
    const edited = [
      {
        id: createQuestionId(),
        googleQuestionId: null,
        active: true,
        type: 'scale' as const,
        title: 'Clarity',
        options: '1|5',
        helpText: '',
        required: true,
      },
      {
        id: createQuestionId(),
        googleQuestionId: null,
        active: true,
        type: 'text' as const,
        title: 'Notes',
        options: '',
        helpText: '',
        required: false,
      },
    ];
    const next = stabilizeQuestionsForRepeat(prev, edited);
    expect(next[0].id).toBe('q_stable');
    expect(semanticQuestionKey(next[1])).toBe('text::notes');
    expect(next[1].id).not.toBe('q_stable');
  });

  it('creates cycle + first run and repeat creates new run id', () => {
    const data: SurveyDataFile = {
      defaults: createDefaultSurveyData(),
      surveys: [],
      activeSurveyId: null,
      cycles: [],
    };
    const created = createCycleWithFirstRun(data, {
      title: 'Team pulse',
      introText: 'Hi',
      emailSubject: 'Pulse',
      questions: data.defaults.questions,
      recipients: [],
      dateFrom: '2026-07-09',
      dateTo: '2026-10-09',
      scope: 'direct',
      projects: [],
    });
    expect(created.cycle.currentRunId).toBe(created.run.id);
    const repeated = repeatCycleRun(created.data, created.cycle.id, {
      title: 'Team pulse',
      introText: 'Hi',
      emailSubject: 'Pulse',
      questions: created.run.questions,
      recipients: [],
      dateFrom: '2026-07-09',
      dateTo: '2026-10-09',
      scope: 'direct',
      projects: [],
    });
    expect(repeated?.run.id).not.toBe(created.run.id);
    expect(repeated?.data.surveys.filter((s) => s.cycleId === created.cycle.id)).toHaveLength(2);
  });

  it('maps closed runs to stopped phase', () => {
    const run = surveyStub('r1', 'c1');
    expect(deriveRunPhase(run)).toBe('active');
    expect(deriveRunPhase({ ...run, status: 'closed' })).toBe('stopped');
  });
});

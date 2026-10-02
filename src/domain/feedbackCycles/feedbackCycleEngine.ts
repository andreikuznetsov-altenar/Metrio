import type { SurveyDataFile, Survey, SurveyQuestion } from '../survey/types';
import type { FeedbackCycle, FeedbackSurveyTemplate } from './feedbackCycleTypes';
import { getTemplateById } from './feedbackTemplates';
import { cycleNeedsNewRun } from './feedbackScheduling';
import { createSurveyId } from '../../services/survey/surveyPersistence';
import { createDefaultSurveyData } from '../survey/defaults';

export function createCycleId(): string {
  return `fcycle_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function questionsFromTemplate(template: FeedbackSurveyTemplate): SurveyQuestion[] {
  return template.questions.map((q) => ({
    id: q.questionKey,
    googleQuestionId: null,
    active: q.active,
    type: q.type,
    title: q.title,
    options: q.options,
    helpText: q.helpText,
    required: q.required,
  }));
}

export function createDraftRunForCycle(
  data: SurveyDataFile,
  cycle: FeedbackCycle,
  periodKey: string,
  filters: {
    dateFrom: string;
    dateTo: string;
    scope: 'direct';
    projects: string[];
  },
): Survey {
  const template = cycle.surveyTemplateId
    ? getTemplateById(data.templates ?? [], cycle.surveyTemplateId)
    : null;
  const defaults = data.defaults;
  const now = new Date().toISOString();
  const due = new Date();
  due.setDate(due.getDate() + 7);

  return {
    id: createSurveyId(),
    cycleId: cycle.id,
    periodKey,
    templateId: template?.id ?? null,
    templateVersion: template?.version ?? null,
    dueAt: due.toISOString(),
    confidentiality: cycle.confidentiality ?? 'identified',
    googleFormId: null,
    responderUri: null,
    createdAt: now,
    updatedAt: now,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    scope: filters.scope,
    projects: filters.projects,
    title: template?.defaults.title ?? defaults.title ?? createDefaultSurveyData().title,
    emailSubject: template?.defaults.emailSubject ?? defaults.emailSubject,
    introText: template?.defaults.introText ?? defaults.introText,
    buttonLabel: template?.defaults.buttonLabel ?? defaults.buttonLabel,
    signature: template?.defaults.signature ?? defaults.signature,
    questions: template
      ? questionsFromTemplate(template)
      : defaults.questions.map((q) => ({ ...q })),
    recipients: [],
    responses: [],
    sendBatches: [],
    status: 'draft',
    questionsLocked: false,
    emailsSent: false,
    lastResponseSyncAt: null,
    error: null,
  };
}

export interface EvaluateCyclesResult {
  data: SurveyDataFile;
  createdRunIds: string[];
}

export function evaluateFeedbackCycles(
  data: SurveyDataFile,
  now = new Date(),
): EvaluateCyclesResult {
  const launched = { ...(data.scheduleState?.launchedPeriodKeys ?? {}) };
  const existingKeys = new Set(Object.keys(launched));
  for (const survey of data.surveys) {
    if (survey.periodKey) existingKeys.add(survey.periodKey);
  }

  const createdRunIds: string[] = [];
  const cycles = data.cycles ?? [];
  let surveys = [...data.surveys];
  let activeSurveyId = data.activeSurveyId;

  const dateTo = now.toISOString().slice(0, 10);
  const dateFrom = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

  for (const cycle of cycles) {
    const check = cycleNeedsNewRun(cycle, existingKeys, now);
    if (!check?.needed) continue;

    const run = createDraftRunForCycle(data, cycle, check.periodKey, {
      dateFrom,
      dateTo,
      scope: 'direct',
      projects: [],
    });
    surveys.push(run);
    launched[check.periodKey] = run.id;
    existingKeys.add(check.periodKey);
    createdRunIds.push(run.id);

    const nextCycle: FeedbackCycle = {
      ...cycle,
      currentRunId: run.id,
      updatedAt: now.toISOString(),
    };
    const idx = cycles.indexOf(cycle);
    cycles[idx] = nextCycle;
    if (!activeSurveyId) activeSurveyId = run.id;
  }

  return {
    data: {
      ...data,
      surveys,
      cycles,
      activeSurveyId,
      scheduleState: {
        ...data.scheduleState,
        lastEvaluatedAt: now.toISOString(),
        launchedPeriodKeys: launched,
      },
    },
    createdRunIds,
  };
}

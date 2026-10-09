import { createCycleId } from '../feedbackCycles/feedbackCycleEngine';
import type { FeedbackCycle } from '../feedbackCycles/feedbackCycleTypes';
import type { Survey, SurveyDataFile, SurveyQuestion, SurveyRecipient } from '../survey/types';
import { createSurveyId } from '../../services/survey/surveyPersistence';
import { assignQuestionIds, stabilizeQuestionsForRepeat } from './questionIdentity';
import { runsForCycle } from '../feedbackCycles/runComparison';

export interface NewFeedbackSurveyInput {
  title: string;
  introText: string;
  emailSubject: string;
  questions: SurveyQuestion[];
  recipients: SurveyRecipient[];
  dateFrom: string;
  dateTo: string;
  scope: 'full' | 'direct';
  projects: string[];
}

function baseRunFields(
  input: NewFeedbackSurveyInput,
  cycleId: string,
  defaults: SurveyDataFile['defaults'],
): Survey {
  const now = new Date().toISOString();
  return {
    id: createSurveyId(),
    cycleId,
    periodKey: `run-${now}`,
    templateId: null,
    templateVersion: null,
    dueAt: null,
    confidentiality: 'identified',
    googleFormId: null,
    responderUri: null,
    createdAt: now,
    updatedAt: now,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    scope: input.scope,
    projects: input.projects,
    title: input.title,
    emailSubject: input.emailSubject || defaults.emailSubject,
    introText: input.introText || defaults.introText,
    buttonLabel: defaults.buttonLabel,
    signature: defaults.signature,
    questions: assignQuestionIds(input.questions),
    recipients: input.recipients,
    responses: [],
    sendBatches: [],
    status: 'draft',
    questionsLocked: false,
    emailsSent: false,
    lastResponseSyncAt: null,
    error: null,
  };
}

export function createCycleWithFirstRun(
  data: SurveyDataFile,
  input: NewFeedbackSurveyInput,
): { data: SurveyDataFile; cycle: FeedbackCycle; run: Survey } {
  const now = new Date().toISOString();
  const cycleId = createCycleId();
  const run = baseRunFields(input, cycleId, data.defaults);
  const cycle: FeedbackCycle = {
    id: cycleId,
    name: input.title,
    type: 'custom',
    status: 'active',
    currentRunId: run.id,
    createdAt: now,
    updatedAt: now,
  };
  const cycles = [...(data.cycles ?? []), cycle];
  const surveys = [run, ...data.surveys];
  return {
    data: { ...data, cycles, surveys, activeSurveyId: run.id },
    cycle,
    run,
  };
}

export function repeatCycleRun(
  data: SurveyDataFile,
  cycleId: string,
  input: NewFeedbackSurveyInput,
): { data: SurveyDataFile; cycle: FeedbackCycle; run: Survey } | null {
  const cycles = data.cycles ?? [];
  const cycle = cycles.find((c) => c.id === cycleId);
  if (!cycle) return null;
  const priorRuns = runsForCycle(data.surveys, cycleId);
  const last = priorRuns[priorRuns.length - 1];
  const questions = last
    ? stabilizeQuestionsForRepeat(last.questions, assignQuestionIds(input.questions))
    : assignQuestionIds(input.questions);
  const run = {
    ...baseRunFields({ ...input, questions }, cycleId, data.defaults),
    recipients: input.recipients.length ? input.recipients : last?.recipients ?? [],
  };
  const now = new Date().toISOString();
  const nextCycle: FeedbackCycle = {
    ...cycle,
    name: input.title || cycle.name,
    currentRunId: run.id,
    updatedAt: now,
  };
  const nextCycles = cycles.map((c) => (c.id === cycleId ? nextCycle : c));
  const surveys = [run, ...data.surveys];
  return {
    data: { ...data, cycles: nextCycles, surveys, activeSurveyId: run.id },
    cycle: nextCycle,
    run,
  };
}

export function deleteFeedbackCycle(data: SurveyDataFile, cycleId: string): SurveyDataFile {
  const cycles = (data.cycles ?? []).filter((c) => c.id !== cycleId);
  const surveys = data.surveys.filter((s) => s.cycleId !== cycleId);
  const activeSurveyId =
    data.activeSurveyId && surveys.some((s) => s.id === data.activeSurveyId)
      ? data.activeSurveyId
      : null;
  return { ...data, cycles, surveys, activeSurveyId };
}

export function attachLegacyOrphanSurveysAsCycles(data: SurveyDataFile): SurveyDataFile {
  const cycles = [...(data.cycles ?? [])];
  const knownRunIds = new Set(
    cycles.map((c) => c.currentRunId).filter(Boolean) as string[],
  );
  const orphans = data.surveys.filter(
    (s) => !s.cycleId && !knownRunIds.has(s.id),
  );
  if (!orphans.length) return data;

  const nextCycles = [...cycles];
  const nextSurveys = [...data.surveys];
  for (const survey of orphans) {
    const cycleId = createCycleId();
    const cycle: FeedbackCycle = {
      id: cycleId,
      name: survey.title || 'Legacy survey',
      type: 'custom',
      status: survey.status === 'closed' ? 'archived' : 'active',
      currentRunId: survey.id,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    };
    nextCycles.push(cycle);
    const idx = nextSurveys.findIndex((s) => s.id === survey.id);
    if (idx >= 0) {
      nextSurveys[idx] = {
        ...nextSurveys[idx],
        cycleId,
        periodKey: nextSurveys[idx].periodKey ?? `legacy-${survey.id}`,
      };
    }
  }
  return { ...data, cycles: nextCycles, surveys: nextSurveys };
}

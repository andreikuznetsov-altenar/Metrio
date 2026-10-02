import { BUILTIN_FEEDBACK_TEMPLATES } from './feedbackTemplates';
import type { FeedbackCyclesData } from './feedbackCycleTypes';
import type { Survey, SurveyDataFile } from '../survey/types';

export const FEEDBACK_CYCLES_SCHEMA_EXTENSION = 2;

export function ensureFeedbackCyclesData(
  raw: Partial<SurveyDataFile>,
): FeedbackCyclesData {
  const cycles = raw.cycles ?? [];
  const templates =
    raw.templates && raw.templates.length > 0
      ? raw.templates
      : BUILTIN_FEEDBACK_TEMPLATES;
  return {
    cycles,
    templates,
    scheduleState: raw.scheduleState ?? { launchedPeriodKeys: {} },
  };
}

/** Map legacy surveys to one-off runs — no data loss. */
export function tagLegacySurveysAsRuns(surveys: Survey[]): Survey[] {
  return surveys.map((survey) => ({
    ...survey,
    cycleId: survey.cycleId ?? null,
    periodKey: survey.periodKey ?? `legacy-${survey.id}`,
    confidentiality: survey.confidentiality ?? 'identified',
  }));
}

export function applyFeedbackCyclesMigration(data: SurveyDataFile): SurveyDataFile {
  const cyclesBlock = ensureFeedbackCyclesData(data);
  return {
    ...data,
    schemaVersion: Math.max(
      data.schemaVersion ?? 1,
      FEEDBACK_CYCLES_SCHEMA_EXTENSION,
    ),
    surveys: tagLegacySurveysAsRuns(data.surveys),
    cycles: cyclesBlock.cycles,
    templates: cyclesBlock.templates,
    scheduleState: cyclesBlock.scheduleState,
  };
}

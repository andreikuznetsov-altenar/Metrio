import type { SurveyConfigDefaults } from '../survey/types';

export type FeedbackCycleType =
  | 'pulse'
  | 'onboarding'
  | 'project'
  | 'team'
  | 'manager'
  | 'custom';

export type FeedbackCycleStatus = 'draft' | 'active' | 'paused' | 'archived';

export type FeedbackCadenceUnit = 'weekly' | 'biweekly' | 'monthly';

export interface FeedbackCadence {
  unit: FeedbackCadenceUnit;
  /** Local timezone semantics — evaluated on app host calendar */
  timezone: 'local';
}

export type AudienceRuleKind =
  | 'self'
  | 'direct_reports'
  | 'selected_people'
  | 'team_direct_scope'
  | 'new_starter'
  | 'project_participants';

export interface AudienceRule {
  kind: AudienceRuleKind;
  personIds?: string[];
  projectKeys?: string[];
  /** Days after hireDate for onboarding triggers (configurable) */
  onboardingDays?: number[];
  /** Optional separate manager survey — never mixed into starter form */
  includeManagerSurvey?: boolean;
}

export interface FeedbackCycle {
  id: string;
  name: string;
  type: FeedbackCycleType;
  status: FeedbackCycleStatus;
  cadence?: FeedbackCadence;
  audienceRule?: AudienceRule;
  surveyTemplateId?: string | null;
  currentRunId?: string | null;
  confidentiality?: import('../survey/types').FeedbackConfidentiality;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackTemplateQuestion {
  questionKey: string;
  type: import('../survey/types').SurveyQuestionType;
  title: string;
  options: string;
  helpText: string;
  required: boolean;
  active: boolean;
}

export interface FeedbackSurveyTemplate {
  id: string;
  category: 'team' | 'onboarding' | 'project' | 'custom';
  name: string;
  version: number;
  description?: string;
  defaults: Pick<
    SurveyConfigDefaults,
    'title' | 'emailSubject' | 'introText' | 'buttonLabel' | 'signature'
  >;
  questions: FeedbackTemplateQuestion[];
}

export interface FeedbackScheduleState {
  lastEvaluatedAt?: string;
  /** periodKey → runId for dedupe */
  launchedPeriodKeys?: Record<string, string>;
}

export interface FeedbackCyclesData {
  cycles: FeedbackCycle[];
  templates: FeedbackSurveyTemplate[];
  scheduleState?: FeedbackScheduleState;
}

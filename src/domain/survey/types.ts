export type SurveyQuestionType = 'scale' | 'paragraph' | 'multiple' | 'text';

export type SurveyStatus =
  | 'draft'
  | 'prepared'
  | 'ready'
  | 'sending'
  | 'active'
  | 'closed'
  | 'error';

export type RecipientStatus =
  | 'ready'
  | 'no_email'
  | 'sending'
  | 'sent'
  | 'responded'
  | 'failed';

export type EmailSource = 'jira' | 'bamboo' | 'manual' | 'missing';

export interface SurveyQuestion {
  id: string;
  googleQuestionId: string | null;
  active: boolean;
  type: SurveyQuestionType;
  title: string;
  options: string;
  helpText: string;
  required: boolean;
}

export interface SurveyRecipient {
  id: string;
  reporterAccountId: string;
  reporterName: string;
  reporterEmail: string;
  issueKeys: string[];
  projects: string[];
  emailSource: EmailSource;
  selected: boolean;
  status: RecipientStatus;
  sentAt: string | null;
  respondedAt: string | null;
  gmailMessageId: string | null;
  sendBatchId: string | null;
  error: string | null;
  notes: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  lastReminderError: string | null;
}

export interface SurveyResponseAnswer {
  questionId: string;
  googleQuestionId: string | null;
  questionTitle: string;
  value: string;
}

export interface SurveyResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers: SurveyResponseAnswer[];
}

export interface SurveySendBatch {
  id: string;
  surveyId: string;
  startedAt: string;
  completedAt: string | null;
  requestedCount: number;
  sentCount: number;
  failedCount: number;
}

export type FeedbackConfidentiality =
  | 'identified'
  | 'confidential_named'
  | 'anonymous_aggregated';

/** Feedback run instance — same persistence row as legacy Survey. */
export interface Survey {
  id: string;
  /** Parent cycle; null = legacy one-off run */
  cycleId?: string | null;
  /** Dedup key for scheduled runs e.g. 2026-W10 or 2026-03 */
  periodKey?: string | null;
  templateId?: string | null;
  templateVersion?: number | null;
  dueAt?: string | null;
  confidentiality?: FeedbackConfidentiality;
  googleFormId: string | null;
  responderUri: string | null;
  createdAt: string;
  updatedAt: string;
  dateFrom: string;
  dateTo: string;
  scope: 'full' | 'direct';
  projects: string[];
  title: string;
  emailSubject: string;
  introText: string;
  buttonLabel: string;
  signature: string;
  questions: SurveyQuestion[];
  recipients: SurveyRecipient[];
  responses: SurveyResponse[];
  sendBatches: SurveySendBatch[];
  status: SurveyStatus;
  questionsLocked: boolean;
  emailsSent: boolean;
  lastResponseSyncAt: string | null;
  error: string | null;
}

export interface SurveyConfigDefaults {
  title: string;
  emailSubject: string;
  introText: string;
  buttonLabel: string;
  signature: string;
  questions: SurveyQuestion[];
  emailCollectionMode: 'VERIFIED' | 'RESPONDER_INPUT';
  responseAccess: 'restricted' | 'anyone_with_link';
}

export interface SurveyDataFile {
  schemaVersion?: number;
  defaults: SurveyConfigDefaults;
  surveys: Survey[];
  activeSurveyId: string | null;
  cycles?: import('../feedbackCycles/feedbackCycleTypes').FeedbackCycle[];
  templates?: import('../feedbackCycles/feedbackCycleTypes').FeedbackSurveyTemplate[];
  scheduleState?: import('../feedbackCycles/feedbackCycleTypes').FeedbackScheduleState;
}

export interface PrepareValidationIssue {
  field: string;
  message: string;
}

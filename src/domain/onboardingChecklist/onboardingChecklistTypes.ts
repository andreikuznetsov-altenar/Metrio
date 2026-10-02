import type { OnboardingResourceTarget } from "../onboarding/resourceTypes";

export const ONBOARDING_CHECKLIST_DATA_SCHEMA_VERSION = 1;

export type OnboardingItemCategory =
  | "company"
  | "team"
  | "tools"
  | "knowledge"
  | "bamboo"
  | "jira"
  | "feedback";

export type OnboardingItemSource =
  | "curated"
  | "bamboo"
  | "jira"
  | "confluence"
  | "feedback"
  | "manual";

export type OnboardingCompletionMode =
  | "manual"
  | "bamboo_api"
  | "jira_api"
  | "confluence_explicit"
  | "feedback_state";

export type OnboardingItemStatus =
  | "pending"
  | "complete"
  | "blocked"
  | "not_applicable";

export type OnboardingPhase =
  | "first_day"
  | "first_week"
  | "first_month"
  | "before_day_60";

export interface OnboardingItemEvidence {
  kind: OnboardingCompletionMode | "manual";
  summary: string;
  at?: string;
}

export interface OnboardingItem {
  id: string;
  title: string;
  description?: string;
  category: OnboardingItemCategory;
  source: OnboardingItemSource;
  completionMode: OnboardingCompletionMode;
  status: OnboardingItemStatus;
  phase: OnboardingPhase;
  target?: OnboardingResourceTarget;
  dueDay?: number;
  dueLabel?: string;
  evidence?: OnboardingItemEvidence;
  /** Milestone-only copy (e.g. first Jira assignment) */
  isMilestone?: boolean;
  canManualComplete: boolean;
  canManualUndo: boolean;
  autoCompleted: boolean;
}

export interface OnboardingChecklistProgress {
  complete: number;
  total: number;
  headline: string;
  nextItems: OnboardingItem[];
}

export interface OnboardingChecklistModel {
  accountKey: string;
  hireDate: string;
  dayNumber: number;
  active: boolean;
  configVersion: number;
  items: OnboardingItem[];
  progress: OnboardingChecklistProgress;
  byCategory: Partial<Record<OnboardingItemCategory, OnboardingItem[]>>;
}

export interface ManualCompletionRecord {
  completedAt: string;
  undoneAt?: string;
}

export interface OnboardingAccountState {
  employeeId: string;
  manualCompletions: Record<string, ManualCompletionRecord>;
}

export interface OnboardingChecklistDataFile {
  schemaVersion: number;
  accounts: Record<string, OnboardingAccountState>;
}

export interface ManagerOnboardingProgressRow {
  personId: string;
  personName: string;
  dayLabel: string;
  progressLabel: string;
  remainingTitles: string[];
}

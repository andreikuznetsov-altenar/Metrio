export type GoalScope = "person" | "team";

export type GoalStatus =
  | "draft"
  | "active"
  | "completed"
  | "paused"
  | "cancelled";

export type GoalProgressMode = "manual" | "linked_work" | "linked_issue_count";

export type ManualProgressStep = "not_started" | "in_progress" | "completed";

export interface ManualProgress {
  kind: "steps";
  step: ManualProgressStep;
}

export interface ManualProgressPercent {
  kind: "percent";
  /** 0–100, labelled as manually maintained in UI */
  value: number;
}

export type GoalManualProgress = ManualProgress | ManualProgressPercent;

export interface Goal {
  id: string;
  title: string;
  description?: string;
  ownerPersonId: string;
  createdByPersonId?: string;
  scope: GoalScope;
  status: GoalStatus;
  startDate?: string;
  targetDate?: string;
  reviewDate?: string;
  progressMode: GoalProgressMode;
  manualProgress?: GoalManualProgress;
  linkedJiraIssueKeys: string[];
  linkedJiraProjectKeys: string[];
  linkedConfluencePageIds: string[];
  employeeMayEditManualProgress: boolean;
  createdAt: string;
  updatedAt: string;
  /** Optimistic concurrency for Metrio Cloud */
  revision?: number;
}

export interface GoalHistoryEntry {
  id: string;
  goalId: string;
  at: string;
  actorPersonId?: string;
  field: string;
  previousValue?: string;
  nextValue?: string;
  note?: string;
}

export interface GoalsDataFile {
  schemaVersion: number;
  goals: Goal[];
  history: GoalHistoryEntry[];
}

export const GOALS_DATA_SCHEMA_VERSION = 1;

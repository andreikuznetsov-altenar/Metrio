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

/** Metrio-only sidecar keyed by Bamboo employee + goal id. */
export interface BambooGoalSidecarRecord {
  bambooEmployeeId: string;
  bambooGoalId: string;
  linkedJiraIssueKeys: string[];
  linkedJiraProjectKeys: string[];
  linkedConfluencePageIds: string[];
  updatedAt: string;
}

export interface GoalsDataFile {
  schemaVersion: number;
  goals: Goal[];
  history: GoalHistoryEntry[];
  /** Sidecar metadata for Bamboo-backed goals — never HR SoT fields. */
  bambooSidecars?: BambooGoalSidecarRecord[];
}

export const GOALS_DATA_SCHEMA_VERSION = 1;

/** Legacy Metrio-only goals have no Bamboo identity. */
export function isLegacyMetrioOnlyGoal(goal: Goal): boolean {
  const bambooId = (goal as Goal & { bambooGoalId?: string }).bambooGoalId;
  return !bambooId;
}

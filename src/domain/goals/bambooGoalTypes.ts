/** BambooHR is source of truth for HR goal fields. */

export type BambooGoalStatusFilter =
  | "status-inProgress"
  | "status-completed"
  | "status-closed"
  | "status-all";

export type BambooGoalStatus =
  | "in_progress"
  | "completed"
  | "closed"
  | "unknown";

export interface BambooGoalMilestone {
  id: string;
  title: string;
  /** Current progress value when Bamboo returns one */
  currentValue?: number | null;
  /** Target / goal value for measurable milestones */
  goalValue?: number | null;
  completed?: boolean;
  completionDate?: string | null;
  percentComplete?: number | null;
}

export interface BambooGoalAction {
  id?: string;
  action?: string;
  allowed?: boolean;
  [key: string]: unknown;
}

export interface BambooGoal {
  id: string;
  employeeId: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  percentComplete: number;
  completionDate?: string | null;
  status: BambooGoalStatus;
  sharedWithEmployeeIds: string[];
  alignsWithOptionId?: string | null;
  milestones: BambooGoalMilestone[];
  actions?: BambooGoalAction[];
  /** Raw status string from Bamboo when not normalized */
  rawStatus?: string;
  hasMilestones: boolean;
}

export interface BambooGoalShareOption {
  employeeId: string;
  displayName?: string;
  [key: string]: unknown;
}

export interface BambooGoalAlignmentOption {
  id: string;
  title?: string;
  [key: string]: unknown;
}

export interface BambooCreateGoalInput {
  title: string;
  description?: string;
  dueDate: string;
  sharedWithEmployeeIds: string[];
  alignsWithOptionId?: string | null;
  /** Simple goals only — omit for milestone goals */
  percentComplete?: number;
  completionDate?: string | null;
  milestones?: Array<{ title: string }>;
}

export interface BambooUpdateGoalInput {
  title: string;
  description?: string;
  dueDate: string;
  sharedWithEmployeeIds: string[];
  alignsWithOptionId?: string | null;
  /**
   * Only include when intentionally appending NEW milestones.
   * Bamboo v1_1 appends any milestones supplied here.
   */
  milestones?: Array<{ title: string }>;
}

export interface BambooGoalSidecar {
  bambooEmployeeId: string;
  bambooGoalId: string;
  linkedJiraIssueKeys: string[];
  linkedJiraProjectKeys: string[];
  linkedConfluencePageIds: string[];
  updatedAt: string;
}

export function bambooGoalSidecarKey(
  employeeId: string,
  goalId: string,
): string {
  return `${String(employeeId).trim()}::${String(goalId).trim()}`;
}

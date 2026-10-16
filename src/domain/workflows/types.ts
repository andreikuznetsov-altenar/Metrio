import type { AuditIssue } from '../jira/types';

export type CanonicalStage =
  | 'unknown'
  | 'backlog'
  | 'active'
  | 'review'
  | 'qa'
  | 'waiting'
  | 'hold'
  | 'done'
  | 'cancelled';

/**
 * What the CURRENT ASSIGNEE is expected to do in a status. This is workflow-profile semantics
 * (who actually performs the work in that stage), not something inferred from status names.
 * - hands_on:      the assignee is expected to be working on the issue now
 * - queued:        belongs to the assignee, not started yet
 * - reserve:       someone else has it now, but it can come back to the assignee for rework
 * - external_wait: the assignee waits for another person/system/process; no live effort
 *                  (a QA stage may still carry a small rework reserve, see the effort model)
 * - none:          done / cancelled / unmapped / excluded - irrelevant to live workload
 */
export type AssigneeEffortMode = 'hands_on' | 'queued' | 'reserve' | 'external_wait' | 'none';

export interface ResolvedWorkflowStage {
  canonicalStage: CanonicalStage;
  statusName: string;
  /** True only for an explicit profile status map entry. Inference is never mapped. */
  isMapped: boolean;
  diagnosticCode?: 'unmapped_status' | 'inferred_status';
  countsAsActiveWork: boolean;
  countsAsReview: boolean;
  countsAsQa: boolean;
  countsAsWaiting: boolean;
  countsAsHold: boolean;
  countsAsAttentionEligible: boolean;
  countsAsCapacityContributor: boolean;
  isTerminal: boolean;
  isCompletion: boolean;
}

export interface WorkflowTransitionRule {
  from: CanonicalStage;
  to: CanonicalStage;
  /** When true, transitions into `to` start a contributor cycle. */
  startsCycle?: boolean;
  /** When true, transitions into `to` complete a contributor cycle. */
  completesCycle?: boolean;
  /** When true, transition counts as review submission for KPI. */
  countsAsReviewSubmission?: boolean;
}

export interface WorkflowProfile {
  id: string;
  label: string;
  stages: Record<CanonicalStage, ResolvedWorkflowStage>;
  statusToCanonical: Record<string, CanonicalStage>;
  transitionRules: WorkflowTransitionRule[];
  /**
   * When true (corporate default), statuses missing from `statusToCanonical`
   * stay `unknown` instead of using generic name inference.
   */
  strictStatusMap: boolean;
  /** Assignee-effort semantics: stage defaults with optional per-status overrides (normalized keys). */
  assigneeEffort: {
    byStage: Record<CanonicalStage, AssigneeEffortMode>;
    byStatus: Record<string, AssigneeEffortMode>;
  };
}

export interface WorkflowProfileMapping {
  projectKey?: string;
  issueType?: string;
  profileId: string;
}

export interface WorkflowIssueContext {
  issue: AuditIssue;
  profile: WorkflowProfile;
}

export interface ProfileContributorCycle {
  startedAt: string;
  completedAt: string | null;
  hasBackflow: boolean;
  backflowEventCount?: number;
  isFirstPass: boolean;
  progressToReviewMs: number | null;
  reviewToDoneMs: number | null;
  fullCycleMs: number | null;
  /** Full contributor execution time for the cycle (may start before the report window). */
  activeCapacityMs: number;
  /** Execution time overlapping the report window — used for monthly capacity load. */
  activeCapacityMsInPeriod: number;
  /** Canonical owner of the largest hands-on segment, falling back to owner at completion/start. */
  ownerCanonical?: string;
  startedOwnerCanonical?: string;
  executionMsByOwner?: Record<string, number>;
  reviewMs?: number;
  waitingMs?: number;
  holdMs?: number;
  reworkMs?: number;
}


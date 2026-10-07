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

export type WorkflowEfficiencyModel = 'ux' | 'wskins' | 'none';

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
  efficiencyModel: WorkflowEfficiencyModel;
  stages: Record<CanonicalStage, ResolvedWorkflowStage>;
  statusToCanonical: Record<string, CanonicalStage>;
  transitionRules: WorkflowTransitionRule[];
  /**
   * When true (corporate default), statuses missing from `statusToCanonical`
   * stay `unknown` instead of using generic name inference.
   */
  strictStatusMap: boolean;
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
  isFirstPass: boolean;
  progressToReviewMs: number | null;
  reviewToDoneMs: number | null;
  fullCycleMs: number | null;
  /** Full contributor execution time for the cycle (may start before the report window). */
  activeCapacityMs: number;
  /** Execution time overlapping the report window — used for monthly capacity load. */
  activeCapacityMsInPeriod: number;
}

export interface WorkflowKpiTotals {
  startedCount: number;
  reviewSubmittedCount: number;
  completedCount: number;
  firstPassAcceptedCount: number;
  holdCount: number;
  backflowCount: number;
  avgProgressToReviewMs: number | null;
  avgReviewToDoneMs: number | null;
  avgProgressToHoldMs: number | null;
  avgTodoToApprovedMs: number | null;
  efficiencyIndex: number;
  profileBreakdown: Record<string, { completedCount: number; efficiencyIndex: number }>;
}

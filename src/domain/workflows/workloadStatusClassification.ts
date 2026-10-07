import type { AuditIssue } from "../jira/types";
import type { WorkflowProfileMapping } from "./types";
import { resolveWorkflowProfile } from "./resolveWorkflowProfile";
import { resolveWorkflowStage } from "./resolveWorkflowStage";
import type { ResolvedWorkflowStage } from "./types";
import { isTerminalNonCompletionStatus, normalizeIssueStatus } from "../periods/issueTerminalStatus";

export function classifyWorkflowStage(
  issue: AuditIssue,
  mappings?: WorkflowProfileMapping[],
): ResolvedWorkflowStage {
  const profile = resolveWorkflowProfile(issue, { mappings });
  return resolveWorkflowStage(profile, issue.currentStatus || "");
}

export function isCompletedWorkloadStatus(
  stage: ResolvedWorkflowStage,
  status: string,
): boolean {
  return stage.isCompletion || stage.isTerminal || isTerminalNonCompletionStatus(status);
}

/** Active production load (excludes In Review per canonical Apps Script time-stat segments). */
export function isActiveWorkloadStatus(
  issue: AuditIssue,
  mappings?: WorkflowProfileMapping[],
): boolean {
  const status = normalizeIssueStatus(issue.currentStatus || "");
  if (!status) return false;
  const stage = classifyWorkflowStage(issue, mappings);
  if (isCompletedWorkloadStatus(stage, status)) return false;
  return stage.countsAsActiveWork && !stage.countsAsReview;
}

export function isReviewWorkloadStatus(
  issue: AuditIssue,
  mappings?: WorkflowProfileMapping[],
): boolean {
  const stage = classifyWorkflowStage(issue, mappings);
  return stage.countsAsReview;
}

export function isBlockedOrHoldWorkloadStatus(
  issue: AuditIssue,
  mappings?: WorkflowProfileMapping[],
): boolean {
  const stage = classifyWorkflowStage(issue, mappings);
  return stage.countsAsHold;
}

export function isQaWorkloadStatus(
  issue: AuditIssue,
  mappings?: WorkflowProfileMapping[],
): boolean {
  const stage = classifyWorkflowStage(issue, mappings);
  return stage.countsAsQa;
}

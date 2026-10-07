import type { AuditIssue } from '../jira/types';
import { isWorkflowCapacityEligible, isWorkflowKpiEligible } from './eligibility';
import { extractProfileContributorCycles } from './profileCycles';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { normalizeStatusKey } from './normalizeStatus';
import { canonicalStageForStatus, resolveWorkflowStage } from './resolveWorkflowStage';
import type { WorkflowProfileMapping } from './types';

export interface WorkflowIssueDiagnostic {
  issueKey: string;
  projectKey?: string;
  issueTypeName: string;
  profileId: string;
  profileLabel: string;
  currentStatus: string;
  canonicalStage: string;
  kpiEligible: boolean;
  capacityEligible: boolean;
  completedCycles: number;
  unmappedStatuses: string[];
}

export function diagnoseIssueWorkflow(
  issue: AuditIssue,
  mappings?: WorkflowProfileMapping[],
): WorkflowIssueDiagnostic {
  const profile = resolveWorkflowProfile(issue, { mappings });
  const statusNames = new Set<string>();
  if (issue.currentStatus) statusNames.add(issue.currentStatus);
  (issue.events || []).forEach((e) => {
    if (e.eventType === 'Status') {
      if (e.fromValue) statusNames.add(e.fromValue);
      if (e.toValue) statusNames.add(e.toValue);
    }
  });

  const unmappedStatuses = [...statusNames].filter((status) => {
    const key = normalizeStatusKey(status);
    return !profile.statusToCanonical[key] && canonicalStageForStatus(profile, status) === 'unknown';
  });

  const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
  const cycles = extractProfileContributorCycles(issue, profile);

  return {
    issueKey: issue.issueKey,
    projectKey: issue.projectKey,
    issueTypeName: issue.issueTypeName,
    profileId: profile.id,
    profileLabel: profile.label,
    currentStatus: issue.currentStatus || '',
    canonicalStage: stage.canonicalStage,
    kpiEligible: isWorkflowKpiEligible(issue),
    capacityEligible: isWorkflowCapacityEligible(issue),
    completedCycles: cycles.length,
    unmappedStatuses,
  };
}

export function diagnoseWorkflowIssues(
  issues: AuditIssue[],
  mappings?: WorkflowProfileMapping[],
): WorkflowIssueDiagnostic[] {
  return issues.map((issue) => diagnoseIssueWorkflow(issue, mappings));
}

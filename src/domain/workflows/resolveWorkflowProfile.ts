import type { AuditIssue } from '../jira/types';
import type { WorkflowProfile, WorkflowProfileMapping } from './types';
import { DEFAULT_WORKFLOW_MAPPINGS } from './defaultWorkflowMappings';
import { getProfileById } from './profileRegistry';
import { classifyWorkflowProfileSemantically } from './semanticClassifier';
import { simpleWorkflowProfile } from './profiles/simple';

export interface ResolveWorkflowProfileOptions {
  mappings?: WorkflowProfileMapping[];
}

function normalizeKey(value: string | undefined): string {
  return (value || '').trim().toUpperCase();
}

function normalizeIssueType(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function mappingMatches(
  mapping: WorkflowProfileMapping,
  projectKey: string,
  issueType: string,
  requireIssueType: boolean,
): boolean {
  const project = normalizeKey(mapping.projectKey);
  if (project && project !== projectKey) return false;
  if (!requireIssueType) return true;
  const type = normalizeIssueType(mapping.issueType);
  return type ? type === issueType : false;
}

export function resolveWorkflowProfile(
  issue: AuditIssue,
  options: ResolveWorkflowProfileOptions = {},
): WorkflowProfile {
  const companyMappings = options.mappings;
  const mappings = companyMappings?.length
    ? [...DEFAULT_WORKFLOW_MAPPINGS, ...companyMappings]
    : DEFAULT_WORKFLOW_MAPPINGS;
  const projectKey = normalizeKey(issue.projectKey || issue.issueKey.split('-')[0]);
  const issueType = normalizeIssueType(issue.issueTypeName);
  const isSubtask = issue.isSubtask || issueType.includes('sub');

  const withType = mappings.find(
    (m) => mappingMatches(m, projectKey, issueType, true) && m.issueType,
  );
  if (withType) {
    const profile = getProfileById(withType.profileId);
    if (profile) return profile;
  }

  if (isSubtask && projectKey === 'WS') {
    const sub = getProfileById('wskins_subtask');
    if (sub) return sub;
  }

  const projectOnly = mappings.find(
    (m) => mappingMatches(m, projectKey, issueType, false) && !m.issueType,
  );
  if (projectOnly) {
    const profile = getProfileById(projectOnly.profileId);
    if (profile) return profile;
  }

  const semantic = classifyWorkflowProfileSemantically(issue);
  if (semantic.id !== simpleWorkflowProfile.id) {
    return semantic;
  }

  return getProfileById('simple') || simpleWorkflowProfile;
}

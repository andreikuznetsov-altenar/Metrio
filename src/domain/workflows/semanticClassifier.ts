import { devQaReleaseWorkflowProfile } from './profiles/devQaRelease';
import { editorialWorkflowProfile } from './profiles/editorial';
import { governanceWorkflowProfile } from './profiles/governance';
import { productHandoverWorkflowProfile } from './profiles/productHandover';
import { serviceWaitWorkflowProfile } from './profiles/serviceWait';
import { simpleWorkflowProfile } from './profiles/simple';
import { uxWorkflowProfile } from './profiles/ux';
import { wskinsSkinWorkflowProfile } from './profiles/wskinsSkin';
import type { AuditIssue } from '../jira/types';
import type { WorkflowProfile } from './types';
import { canonicalStageForStatus, inferCanonicalFromStatusName } from './resolveWorkflowStage';

function statusSet(issue: AuditIssue): string[] {
  const names = new Set<string>();
  if (issue.currentStatus) names.add(issue.currentStatus);
  (issue.events || []).forEach((e) => {
    if (e.eventType === 'Status') {
      if (e.fromValue) names.add(e.fromValue);
      if (e.toValue) names.add(e.toValue);
    }
  });
  return [...names];
}

/** Generic fallback when no explicit mapping matches. */
export function classifyWorkflowProfileSemantically(issue: AuditIssue): WorkflowProfile {
  const statuses = statusSet(issue);
  const canonical = statuses.map((s) => inferCanonicalFromStatusName(s));

  const hasQa = canonical.includes('qa');
  const hasWaiting = canonical.includes('waiting');
  const hasReview = canonical.includes('review');
  const hasHandover = statuses.some((s) => s.toLowerCase().includes('handover'));
  const hasEditorial = statuses.some((s) =>
    ['writing', 'editing', 'publish'].some((k) => s.toLowerCase().includes(k)),
  );
  const hasGovernance = statuses.some((s) =>
    ['draft', 'archived', 'governance'].some((k) => s.toLowerCase().includes(k)),
  );
  const hasSkin = statuses.some((s) => s.toLowerCase().includes('skin'));

  if (hasHandover) return productHandoverWorkflowProfile;
  if (hasEditorial) return editorialWorkflowProfile;
  if (hasGovernance) return governanceWorkflowProfile;
  if (hasWaiting && !hasQa) return serviceWaitWorkflowProfile;
  if (hasQa) return devQaReleaseWorkflowProfile;
  if (hasSkin) return wskinsSkinWorkflowProfile;
  if (hasReview) return uxWorkflowProfile;

  const type = (issue.issueTypeName || '').toLowerCase();
  if (type.includes('sub')) return simpleWorkflowProfile;

  return simpleWorkflowProfile;
}

export function profileMatchesStatusHistory(
  profile: WorkflowProfile,
  issue: AuditIssue,
): number {
  const statuses = statusSet(issue);
  if (!statuses.length) return 0;
  let hits = 0;
  statuses.forEach((status) => {
    const key = status.toLowerCase();
    if (profile.statusToCanonical[key] || canonicalStageForStatus(profile, status) !== 'backlog') {
      hits++;
    }
  });
  return hits / statuses.length;
}

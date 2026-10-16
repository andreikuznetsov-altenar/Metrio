import { normalizeStatusKey } from './normalizeStatus';
import { canonicalStageForStatus } from './resolveWorkflowStage';
import type { AssigneeEffortMode, WorkflowProfile } from './types';

/**
 * Assignee-effort mode of a raw Jira status under a workflow profile. A per-status override wins,
 * otherwise the profile's canonical-stage semantics apply. Unmapped statuses are `none`: an unknown
 * corporate status must never silently create workload.
 */
export function resolveAssigneeEffortMode(
  profile: WorkflowProfile,
  status: string | undefined,
): AssigneeEffortMode {
  const raw = status || '';
  const override = profile.assigneeEffort.byStatus[normalizeStatusKey(raw)];
  if (override) return override;
  return profile.assigneeEffort.byStage[canonicalStageForStatus(profile, raw)] ?? 'none';
}

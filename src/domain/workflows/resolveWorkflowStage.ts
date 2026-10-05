import { normalizeStatusKey } from './normalizeStatus';
import { presetForCanonicalStage } from './stagePresets';
import type { CanonicalStage, ResolvedWorkflowStage, WorkflowProfile } from './types';

export function canonicalStageForStatus(
  profile: WorkflowProfile,
  status: string,
): CanonicalStage {
  const key = normalizeStatusKey(status);
  const mapped = profile.statusToCanonical[key];
  if (mapped) return mapped;
  return inferCanonicalFromStatusName(status);
}

export function inferCanonicalFromStatusName(status: string): CanonicalStage {
  const n = normalizeStatusKey(status);
  if (!n) return 'backlog';
  if (n.includes('cancel')) return 'cancelled';
  if (
    n.includes('done') ||
    n.includes('approved') ||
    n.includes('published') ||
    n.includes('closed') ||
    n.includes('resolved') ||
    n.includes('released')
  ) {
    return 'done';
  }
  if (n.includes('hold') || n.includes('blocked')) return 'hold';
  if (n.includes('wait')) return 'waiting';
  if (n === 'review' || n.includes('in review') || n.includes('code review')) return 'review';
  if (n.includes('qa') || n.includes('test')) return 'qa';
  if (n.includes('in progress') || n.includes('development') || n.includes('writing')) {
    return 'active';
  }
  if (
    n === 'todo' ||
    n === 'to do' ||
    n === 'open' ||
    n === 'backlog' ||
    n === 'new' ||
    n === 'draft' ||
    n === 'idea'
  ) {
    return 'backlog';
  }
  return 'backlog';
}

export function resolveWorkflowStage(
  profile: WorkflowProfile,
  status: string,
): ResolvedWorkflowStage {
  const canonicalStage = canonicalStageForStatus(profile, status);
  const key = normalizeStatusKey(status);
  const preset = presetForCanonicalStage(canonicalStage, status);
  const profileStage = profile.stages[canonicalStage];
  const explicitlyMapped = !!profile.statusToCanonical[key];
  if (!explicitlyMapped && profileStage) {
    return {
      ...preset,
      ...profileStage,
      statusName: status || preset.statusName,
      canonicalStage,
      countsAsAttentionEligible: preset.countsAsAttentionEligible,
      countsAsHold: preset.countsAsHold || profileStage.countsAsHold,
      countsAsWaiting: preset.countsAsWaiting || profileStage.countsAsWaiting,
    };
  }
  const resolved = profileStage || preset;
  return { ...resolved, statusName: status || resolved.statusName, canonicalStage };
}

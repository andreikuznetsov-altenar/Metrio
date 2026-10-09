import type { Survey } from '../survey/types';

export type FeedbackRunPhase = 'draft' | 'active' | 'stopped';

export function deriveRunPhase(run: Survey): FeedbackRunPhase {
  if (run.status === 'closed') return 'stopped';
  if (run.googleFormId) return 'active';
  return 'draft';
}

export function runStatusLabel(phase: FeedbackRunPhase): string {
  switch (phase) {
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Active';
    case 'stopped':
      return 'Stopped';
    default:
      return phase;
  }
}

export function cycleStatusFromRuns(runs: Survey[]): 'draft' | 'active' | 'completed' {
  if (!runs.length) return 'draft';
  const current = runs[runs.length - 1];
  const phase = deriveRunPhase(current);
  if (phase === 'active' || phase === 'draft') return 'active';
  const open = runs.some((r) => deriveRunPhase(r) !== 'stopped');
  return open ? 'active' : 'completed';
}

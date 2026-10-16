/**
 * Current vs historical rework for one issue.
 *
 * "Backflow detected" used to mark a task Problematic forever once ANY qualifying backward
 * transition existed in its history, even after the work was fixed, resubmitted and accepted.
 * Historical rework belongs in Metrics (First Pass, Rework Rate, Backflow Events); Task Health
 * only reacts to rework that is still UNRESOLVED:
 *
 *   unresolved  the task came back from Review/QA and has not been resubmitted yet
 *   resolved    it came back at least once in the open cycle but has been resubmitted since
 *   none        no qualifying return in the open cycle
 *
 * The open cycle starts after the last completion/terminal state, so a reopened task is not
 * charged for rework of an earlier, already closed cycle.
 */
import { getStatusEventsSorted } from '../jira/events';
import type { AuditIssue } from '../jira/types';
import { isProfileBackflow } from '../workflows/profileCycles';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
import { canonicalStageForStatus } from '../workflows/resolveWorkflowStage';
import type { CanonicalStage, WorkflowProfile } from '../workflows/types';

export type ReworkState = 'none' | 'unresolved' | 'resolved';

export interface OpenCycleRework {
  state: ReworkState;
  /** Qualifying returns in the open cycle (resolved or not). */
  openCycleReworkEvents: number;
  /** Returns not yet followed by a resubmission. */
  unresolvedReturnEvents: number;
  lastReworkAt: string | null;
  resubmittedAt: string | null;
}

const RESUBMISSION_STAGES: ReadonlySet<CanonicalStage> = new Set(['review', 'qa', 'waiting']);

export function analyzeOpenCycleRework(
  issue: AuditIssue,
  profile: WorkflowProfile,
): OpenCycleRework {
  let events = 0;
  let unresolvedReturns = 0;
  let lastReworkAt: string | null = null;
  let resubmittedAt: string | null = null;

  for (const event of getStatusEventsSorted(issue)) {
    const toStage = resolveWorkflowStage(profile, event.toValue);
    if (toStage.isCompletion || toStage.isTerminal || toStage.canonicalStage === 'cancelled') {
      // Cycle closed — start counting afresh for any reopening.
      events = 0;
      unresolvedReturns = 0;
      lastReworkAt = null;
      resubmittedAt = null;
      continue;
    }
    if (isProfileBackflow(profile, event.fromValue, event.toValue, event)) {
      events += 1;
      unresolvedReturns += 1;
      lastReworkAt = event.changedAt;
      resubmittedAt = null;
      continue;
    }
    const stage = canonicalStageForStatus(profile, event.toValue);
    if (unresolvedReturns > 0 && RESUBMISSION_STAGES.has(stage)) {
      unresolvedReturns = 0;
      resubmittedAt = event.changedAt;
    }
  }

  const state: ReworkState =
    events === 0 ? 'none' : unresolvedReturns > 0 ? 'unresolved' : 'resolved';
  return {
    state,
    openCycleReworkEvents: events,
    unresolvedReturnEvents: unresolvedReturns,
    lastReworkAt,
    resubmittedAt,
  };
}

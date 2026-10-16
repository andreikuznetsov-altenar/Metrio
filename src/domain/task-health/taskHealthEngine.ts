import { getWeekdayElapsedDurationMs } from '../jira/dates';
import { getStatusEventsSorted } from '../jira/events';
import type { AuditIssue, ReportParams } from '../jira/types';
import {
  extractProfileContributorCycles,
  isProfileBackflow,
} from '../workflows/profileCycles';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
import { analyzeOpenCycleRework, type ReworkState } from './reworkState';
import {
  resolveStageAttentionTarget,
  timedStageKind,
  type StageAttentionTarget,
  type StageTargetBases,
  type TimedStageKind,
} from './stageAttentionTargets';

import { appNow } from "../../platform/appClock";
export type TaskHealthStatus =
  | 'successful'
  | 'stable'
  | 'at_risk'
  | 'problematic'
  | 'done_with_issues'
  | 'no_activity';

/**
 * Why a task has its status. Task Health is a CURRENT-state classification; historical rework is
 * a Metrics concern (First Pass / Rework Rate / Backflow Events), not a permanent health defect.
 */
export type TaskHealthReasonCode =
  | 'not_classified'
  | 'blocked'
  | 'stage_overdue'
  | 'stage_attention'
  | 'repeated_rework'
  | 'unresolved_rework'
  | 'no_activity'
  | 'stable'
  | 'completed_clean'
  | 'completed_with_rework'
  | 'completed_over_target'
  | 'completed_not_first_pass';

export interface TaskHealthThresholds {
  noActivityDays: number;
  /** Base stage attention days before profile scaling (see stageAttentionTargets). */
  stageBases?: Partial<StageTargetBases>;
}

export const DEFAULT_TASK_HEALTH_THRESHOLDS: TaskHealthThresholds = {
  noActivityDays: 7,
};

export interface TaskHealthInput {
  issue: AuditIssue;
  params: ReportParams;
  now?: Date;
  thresholds?: TaskHealthThresholds;
}

export interface TaskHealthResult {
  status: TaskHealthStatus;
  reasonCode: TaskHealthReasonCode;
  reasons: string[];
  /** All-time qualifying backflow events on the issue (display / metrics context only). */
  backflowEventCount: number;
  /** Rework in the OPEN cycle: unresolved = returned and not yet resubmitted. */
  reworkState: ReworkState;
  openCycleReworkEvents: number;
  unresolvedReturnEvents: number;
  isFirstPass: boolean | null;
  isCompleted: boolean;
  currentStageAgeMs: number | null;
  /** Weekday-days in the current stage (fractional), or null when unknown. */
  currentStageAgeDays: number | null;
  /** Timed-stage kind used for the target, 'hold' for blocked work, otherwise null. */
  stageKind: TimedStageKind | 'hold' | null;
  /** Stage/profile-specific targets applied to this issue (null for non-timed stages). */
  stageTarget: StageAttentionTarget | null;
  /** True when no Jira activity for `noActivityDays` or more (independent of the status above). */
  isStale: boolean;
  lastActivityAt: string | null;
}

function daysSince(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  return (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000);
}

function getLastMeaningfulActivityAt(issue: AuditIssue): string | null {
  const events = issue.events || [];
  if (!events.length) return issue.issueCreated || null;
  // Never assume chronological order: a late-sorted event must not hide recent activity.
  let latest = events[0].changedAt;
  let latestMs = Date.parse(latest);
  for (const event of events) {
    const ms = Date.parse(event.changedAt);
    if (Number.isFinite(ms) && (!Number.isFinite(latestMs) || ms > latestMs)) {
      latest = event.changedAt;
      latestMs = ms;
    }
  }
  return latest;
}

export function getCurrentStageStartedAt(issue: AuditIssue): string | null {
  const events = getStatusEventsSorted(issue);
  const currentStatus = issue.currentStatus || '';

  if (!events.length) return issue.issueCreated || null;

  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (
      e.toValue === currentStatus ||
      e.toValue.toLowerCase() === currentStatus.toLowerCase()
    ) {
      return e.changedAt;
    }
  }

  return issue.issueCreated || events[events.length - 1].changedAt;
}

export function getCurrentStageAgeMs(issue: AuditIssue, now: Date): number | null {
  const startedAt = getCurrentStageStartedAt(issue);
  if (!startedAt) return null;
  return getWeekdayElapsedDurationMs(startedAt, now.toISOString());
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Task Health V2 — current-state, stage/profile-aware classification.
 *
 * Priority for an open, attention-eligible task (first match wins):
 *   1. Blocked / on hold               -> problematic (blocked)
 *   2. Stage age > target              -> problematic (stage overdue; target is stage/profile specific)
 *   3. Repeated rework (2+ returns in the open cycle) and still unresolved -> problematic
 *   4. No Jira activity >= N days      -> no_activity
 *   5. Unresolved rework (returned, not resubmitted) -> at_risk
 *   6. Stage age >= attention days     -> at_risk
 *   7. otherwise                       -> stable (resolved rework is noted, never penalised)
 *
 * Hold/blocked is checked before staleness: a blocked task is blocked whether or not anyone
 * touched it. Historical rework alone never makes a task problematic.
 */
export function classifyTaskHealth(input: TaskHealthInput): TaskHealthResult {
  const { issue, params } = input;
  const now = input.now || appNow();
  const thresholds = input.thresholds || DEFAULT_TASK_HEALTH_THRESHOLDS;

  const currentStatus = issue.currentStatus || '';
  const workflowProfile = resolveWorkflowProfile(issue);
  const workflowStage = resolveWorkflowStage(workflowProfile, currentStatus);
  const completed =
    workflowStage.isCompletion || (workflowStage.isTerminal && workflowStage.canonicalStage === 'done');
  const attentionEligible = workflowStage.countsAsAttentionEligible;

  const completedCycles = extractProfileContributorCycles(issue, workflowProfile, params);
  const backflowEventCount = (issue.events || []).filter(
    (e) =>
      e.eventType === 'Status' &&
      isProfileBackflow(workflowProfile, e.fromValue, e.toValue, e),
  ).length;
  const rework = analyzeOpenCycleRework(issue, workflowProfile);

  const lastCycle = completedCycles[completedCycles.length - 1];
  const isFirstPass = lastCycle ? lastCycle.isFirstPass : null;

  const currentStageAgeMs = getCurrentStageAgeMs(issue, now);
  const currentStageAgeDays = currentStageAgeMs === null ? null : currentStageAgeMs / MS_PER_DAY;
  const lastActivityAt = getLastMeaningfulActivityAt(issue);
  const isStale = Boolean(
    lastActivityAt && daysSince(lastActivityAt, now) >= thresholds.noActivityDays,
  );

  const kind = timedStageKind(workflowStage);
  const timedKind = workflowStage.countsAsHold ? null : kind;
  const stageTarget = timedKind
    ? resolveStageAttentionTarget({
        profile: workflowProfile,
        stage: timedKind,
        reviewTargetDays: params.targetReviewDays,
        bases: thresholds.stageBases,
      })
    : null;

  const base = {
    backflowEventCount,
    reworkState: rework.state,
    openCycleReworkEvents: rework.openCycleReworkEvents,
    unresolvedReturnEvents: rework.unresolvedReturnEvents,
    isFirstPass,
    currentStageAgeMs,
    currentStageAgeDays,
    isStale,
    lastActivityAt,
  };

  if (!completed) {
    const open = { ...base, isCompleted: false as const };

    if (!attentionEligible) {
      return {
        ...open,
        status: 'stable',
        reasonCode: 'not_classified',
        reasons: [
          workflowStage.canonicalStage === 'unknown'
            ? 'Unmapped workflow status — not classified'
            : 'Non-execution stage — not attention eligible',
        ],
        stageKind: null,
        stageTarget: null,
      };
    }

    if (workflowStage.countsAsHold) {
      return {
        ...open,
        status: 'problematic',
        reasonCode: 'blocked',
        reasons: ['Blocked or on hold'],
        stageKind: 'hold',
        stageTarget: null,
      };
    }

    const ageDays = currentStageAgeDays;
    const stage = { stageKind: timedKind, stageTarget };

    if (stageTarget && ageDays !== null && ageDays > stageTarget.targetDays) {
      return {
        ...open,
        ...stage,
        status: 'problematic',
        reasonCode: 'stage_overdue',
        reasons: [
          `${stageLabel(stageTarget.stage)} stage exceeds target (${formatDays(ageDays)} of ${formatDays(stageTarget.targetDays)} weekdays)`,
        ],
      };
    }

    if (rework.state === 'unresolved' && rework.openCycleReworkEvents >= 2) {
      return {
        ...open,
        ...stage,
        status: 'problematic',
        reasonCode: 'repeated_rework',
        reasons: [
          `Repeated rework — returned ${rework.openCycleReworkEvents} times, not yet resubmitted`,
        ],
      };
    }

    if (isStale) {
      return {
        ...open,
        ...stage,
        status: 'no_activity',
        reasonCode: 'no_activity',
        reasons: [`No activity for ${thresholds.noActivityDays}+ calendar days`],
      };
    }

    if (rework.state === 'unresolved') {
      return {
        ...open,
        ...stage,
        status: 'at_risk',
        reasonCode: 'unresolved_rework',
        reasons: ['Returned for rework — not yet resubmitted'],
      };
    }

    if (stageTarget && ageDays !== null && ageDays >= stageTarget.attentionDays) {
      return {
        ...open,
        ...stage,
        status: 'at_risk',
        reasonCode: 'stage_attention',
        reasons: [
          `${stageLabel(stageTarget.stage)} stage approaching target (${formatDays(ageDays)} of ${formatDays(stageTarget.targetDays)} weekdays)`,
        ],
      };
    }

    return {
      ...open,
      ...stage,
      status: 'stable',
      reasonCode: 'stable',
      reasons:
        rework.state === 'resolved'
          ? ['Progressing normally', 'Rework resolved — resubmitted']
          : ['Progressing normally'],
    };
  }

  const done = { ...base, isCompleted: true as const, stageKind: null, stageTarget: null };
  const activeTarget = resolveStageAttentionTarget({
    profile: workflowProfile,
    stage: 'active',
    reviewTargetDays: params.targetReviewDays,
    bases: thresholds.stageBases,
  });
  const progressMs = lastCycle?.progressToReviewMs ?? null;
  const cycleHadRework = lastCycle ? lastCycle.hasBackflow : backflowEventCount > 0;
  const overTarget = progressMs !== null && progressMs > activeTarget.targetDays * MS_PER_DAY;

  if (cycleHadRework) {
    return {
      ...done,
      status: 'done_with_issues',
      reasonCode: 'completed_with_rework',
      reasons: ['Completed after rework (not first pass)'],
    };
  }
  if (overTarget) {
    return {
      ...done,
      status: 'done_with_issues',
      reasonCode: 'completed_over_target',
      reasons: ['Completed, but the working stage exceeded its target'],
    };
  }
  if (isFirstPass) {
    return {
      ...done,
      status: 'successful',
      reasonCode: 'completed_clean',
      reasons: ['Completed within target, first pass'],
    };
  }
  return {
    ...done,
    status: 'done_with_issues',
    reasonCode: 'completed_not_first_pass',
    reasons: ['Completed but not first pass'],
  };
}

function stageLabel(stage: TimedStageKind): string {
  return stage === 'active' ? 'Active' : stage === 'review' ? 'Review' : 'QA';
}

function formatDays(days: number): string {
  const rounded = Math.round(days * 10) / 10;
  return String(rounded);
}

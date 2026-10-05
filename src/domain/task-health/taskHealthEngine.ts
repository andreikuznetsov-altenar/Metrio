import { getWorkingDurationMs } from '../jira/dates';
import { getStatusEventsSorted } from '../jira/events';
import { getCycleSegments, buildCompletedCyclesFromSegments } from '../jira/cycles';
import type { AuditIssue, ReportParams } from '../jira/types';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';

export type TaskHealthStatus =
  | 'successful'
  | 'stable'
  | 'at_risk'
  | 'problematic'
  | 'done_with_issues'
  | 'no_activity';

export interface TaskHealthThresholds {
  noActivityDays: number;
  atRiskRatio: number;
}

export const DEFAULT_TASK_HEALTH_THRESHOLDS: TaskHealthThresholds = {
  noActivityDays: 7,
  atRiskRatio: 0.75,
};

export interface TaskHealthInput {
  issue: AuditIssue;
  params: ReportParams;
  now?: Date;
  thresholds?: TaskHealthThresholds;
}

export interface TaskHealthResult {
  status: TaskHealthStatus;
  reasons: string[];
  backflowCount: number;
  isFirstPass: boolean | null;
  isCompleted: boolean;
  currentStageAgeMs: number | null;
  lastActivityAt: string | null;
}

function isBlockedStatus(status: string): boolean {
  const n = status.toLowerCase();
  return n.includes('hold') || n.includes('blocked');
}

function daysSince(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  return (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000);
}

function getLastMeaningfulActivityAt(issue: AuditIssue): string | null {
  const events = issue.events || [];
  if (!events.length) return issue.issueCreated || null;
  return events[events.length - 1].changedAt;
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
  return getWorkingDurationMs(startedAt, now.toISOString());
}

/** Centralized task health classification */
export function classifyTaskHealth(input: TaskHealthInput): TaskHealthResult {
  const { issue, params } = input;
  const now = input.now || new Date();
  const thresholds = input.thresholds || DEFAULT_TASK_HEALTH_THRESHOLDS;
  const targetMs = params.targetReviewDays * 24 * 60 * 60 * 1000;
  const atRiskMs = targetMs * thresholds.atRiskRatio;

  const reasons: string[] = [];
  const currentStatus = issue.currentStatus || '';
  const workflowProfile = resolveWorkflowProfile(issue);
  const workflowStage = resolveWorkflowStage(workflowProfile, currentStatus);
  const completed =
    workflowStage.isCompletion || (workflowStage.isTerminal && workflowStage.canonicalStage === 'done');
  const attentionEligible = workflowStage.countsAsAttentionEligible;

  const segments = getCycleSegments(issue, params);
  const completedCycles = buildCompletedCyclesFromSegments(segments);
  const backflowCount = (issue.events || []).filter(
    (e) => e.eventType === 'Status' && e.isBackflow,
  ).length;

  const lastCycle = completedCycles[completedCycles.length - 1];
  const isFirstPass = lastCycle ? lastCycle.isFirstPass : null;

  const currentStageAgeMs = getCurrentStageAgeMs(issue, now);
  const lastActivityAt = getLastMeaningfulActivityAt(issue);

  if (!completed) {
    if (!attentionEligible) {
      return {
        status: 'stable',
        reasons: ['Waiting — not attention eligible'],
        backflowCount,
        isFirstPass,
        isCompleted: false,
        currentStageAgeMs,
        lastActivityAt,
      };
    }

    if (lastActivityAt && daysSince(lastActivityAt, now) >= thresholds.noActivityDays) {
      reasons.push(`No activity for ${thresholds.noActivityDays}+ days`);
      return {
        status: 'no_activity',
        reasons,
        backflowCount,
        isFirstPass,
        isCompleted: false,
        currentStageAgeMs,
        lastActivityAt,
      };
    }

    if (isBlockedStatus(currentStatus) && workflowStage.countsAsHold) {
      reasons.push('Blocked or on hold');
      return {
        status: 'problematic',
        reasons,
        backflowCount,
        isFirstPass,
        isCompleted: false,
        currentStageAgeMs,
        lastActivityAt,
      };
    }

    if (backflowCount > 0) {
      reasons.push('Backflow detected');
      return {
        status: 'problematic',
        reasons,
        backflowCount,
        isFirstPass,
        isCompleted: false,
        currentStageAgeMs,
        lastActivityAt,
      };
    }

    if (currentStageAgeMs !== null) {
      const stageIsTimed =
        workflowStage.canonicalStage === 'active' ||
        workflowStage.countsAsReview ||
        workflowStage.countsAsQa;
      if (stageIsTimed) {
        if (currentStageAgeMs > targetMs) {
          reasons.push('Current stage exceeds target duration');
          return {
            status: 'problematic',
            reasons,
            backflowCount,
            isFirstPass,
            isCompleted: false,
            currentStageAgeMs,
            lastActivityAt,
          };
        }
        if (currentStageAgeMs > atRiskMs) {
          reasons.push('Current stage approaching target');
          return {
            status: 'at_risk',
            reasons,
            backflowCount,
            isFirstPass,
            isCompleted: false,
            currentStageAgeMs,
            lastActivityAt,
          };
        }
      }
    }

    const activeProgressSegment = segments.find((s) => s.type === 'progress_to_review');
    const progressMs = activeProgressSegment?.ms ?? null;

    if (progressMs !== null && progressMs > targetMs) {
      reasons.push('Target review time exceeded');
      return {
        status: 'problematic',
        reasons,
        backflowCount,
        isFirstPass,
        isCompleted: false,
        currentStageAgeMs,
        lastActivityAt,
      };
    }

    if (progressMs !== null && progressMs > atRiskMs) {
      reasons.push('Approaching target threshold');
      return {
        status: 'at_risk',
        reasons,
        backflowCount,
        isFirstPass,
        isCompleted: false,
        currentStageAgeMs,
        lastActivityAt,
      };
    }

    return {
      status: 'stable',
      reasons: ['Progressing normally'],
      backflowCount,
      isFirstPass,
      isCompleted: false,
      currentStageAgeMs,
      lastActivityAt,
    };
  }

  const activeProgressSegment = segments.find((s) => s.type === 'progress_to_review');
  const progressMs = activeProgressSegment?.ms ?? null;
  const hadIssues = backflowCount > 0 || (progressMs !== null && progressMs > targetMs);

  if (hadIssues) {
    reasons.push('Completed with backflow or target exceeded');
    return {
      status: 'done_with_issues',
      reasons,
      backflowCount,
      isFirstPass,
      isCompleted: true,
      currentStageAgeMs,
      lastActivityAt,
    };
  }

  if (isFirstPass) {
    reasons.push('Completed within target, first pass');
    return {
      status: 'successful',
      reasons,
      backflowCount,
      isFirstPass,
      isCompleted: true,
      currentStageAgeMs,
      lastActivityAt,
    };
  }

  return {
    status: 'done_with_issues',
    reasons: ['Completed but not first pass'],
    backflowCount,
    isFirstPass,
    isCompleted: true,
    currentStageAgeMs,
    lastActivityAt,
  };
}

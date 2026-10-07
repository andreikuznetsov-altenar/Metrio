import { getWorkingDurationMs } from '../jira/dates';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { canonicalStageForStatus, resolveWorkflowStage } from './resolveWorkflowStage';
import type { CanonicalStage, ProfileContributorCycle, WorkflowProfile } from './types';

const STAGE_RANK: Record<CanonicalStage, number> = {
  unknown: 0,
  backlog: 1,
  active: 2,
  review: 3,
  qa: 4,
  waiting: 4,
  hold: 2,
  done: 5,
  cancelled: 5,
};

function getStatusEvents(issue: AuditIssue): IssueEvent[] {
  return (issue.events || [])
    .filter((e) => e.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

export function isProfileBackflow(
  profile: WorkflowProfile,
  fromStatus: string,
  toStatus: string,
  event: IssueEvent,
): boolean {
  if (event.excludeFromEfficiencyBackflow) return false;
  const from = canonicalStageForStatus(profile, fromStatus);
  const to = canonicalStageForStatus(profile, toStatus);
  const fromRank = STAGE_RANK[from];
  const toRank = STAGE_RANK[to];
  if (!fromRank || !toRank) return false;
  if (from === 'hold' || to === 'hold') return false;
  return toRank < fromRank && to !== 'backlog';
}

function ruleMatches(
  profile: WorkflowProfile,
  from: CanonicalStage,
  to: CanonicalStage,
  predicate: (rule: (typeof profile.transitionRules)[number]) => boolean,
): boolean {
  return profile.transitionRules.some((rule) => rule.from === from && rule.to === to && predicate(rule));
}

export function extractProfileContributorCycles(
  issue: AuditIssue,
  profile: WorkflowProfile,
  _params?: ReportParams,
): ProfileContributorCycle[] {
  const events = getStatusEvents(issue);
  const cycles: ProfileContributorCycle[] = [];

  let cycleStart: string | null = null;
  let cycleHasBackflow = false;
  let progressStartedAt: string | null = null;
  let reviewStartedAt: string | null = null;
  let cycleTodoStartedAt: string | null = null;
  let activeCapacityMs = 0;
  let lastCapacityAt: string | null = null;
  let lastCanonical: CanonicalStage | null = null;

  const flushCapacityTo = (endedAt: string) => {
    if (!lastCapacityAt || !lastCanonical) return;
    const stage = profile.stages[lastCanonical];
    if (!stage?.countsAsCapacityContributor) return;
    const ms = getWorkingDurationMs(lastCapacityAt, endedAt);
    if (ms !== null && ms >= 0) activeCapacityMs += ms;
  };

  events.forEach((event) => {
    const fromStatus = event.fromValue || '';
    const toStatus = event.toValue || '';
    const from = canonicalStageForStatus(profile, fromStatus);
    const to = canonicalStageForStatus(profile, toStatus);

    if (isProfileBackflow(profile, fromStatus, toStatus, event)) {
      cycleHasBackflow = true;
    }

    flushCapacityTo(event.changedAt);
    lastCapacityAt = event.changedAt;
    lastCanonical = to;

    if (ruleMatches(profile, from, to, (r) => !!r.startsCycle)) {
      cycleStart = event.changedAt;
      cycleTodoStartedAt = event.changedAt;
      progressStartedAt = event.changedAt;
      reviewStartedAt = null;
      cycleHasBackflow = false;
      activeCapacityMs = 0;
      lastCapacityAt = event.changedAt;
      lastCanonical = to;
      return;
    }

    if (from === 'backlog' && to === 'active' && !cycleStart) {
      cycleStart = event.changedAt;
      cycleTodoStartedAt = event.changedAt;
      progressStartedAt = event.changedAt;
      reviewStartedAt = null;
      cycleHasBackflow = false;
      activeCapacityMs = 0;
      return;
    }

    if (
      (from === 'active' && to === 'review') ||
      ruleMatches(profile, from, to, (r) => !!r.countsAsReviewSubmission && to === 'review')
    ) {
      if (progressStartedAt) {
        reviewStartedAt = event.changedAt;
      }
      progressStartedAt = null;
      return;
    }

    if (to === 'active' && from !== 'backlog') {
      progressStartedAt = event.changedAt;
    }

    const completesCycle =
      ruleMatches(profile, from, to, (r) => !!r.completesCycle) ||
      (to === 'done' && !!cycleStart);

    if (completesCycle && cycleStart) {
      flushCapacityTo(event.changedAt);
      const reviewToDoneMs =
        reviewStartedAt ? getWorkingDurationMs(reviewStartedAt, event.changedAt) : null;
      const fullCycleMs = cycleTodoStartedAt
        ? getWorkingDurationMs(cycleTodoStartedAt, event.changedAt)
        : null;
      let progressToReviewMs: number | null = null;
      if (cycleTodoStartedAt && reviewStartedAt) {
        progressToReviewMs = getWorkingDurationMs(cycleTodoStartedAt, reviewStartedAt);
      }

      cycles.push({
        startedAt: cycleStart,
        completedAt: event.changedAt,
        hasBackflow: cycleHasBackflow,
        isFirstPass: !cycleHasBackflow,
        progressToReviewMs,
        reviewToDoneMs,
        fullCycleMs,
        activeCapacityMs,
      });

      cycleStart = null;
      cycleTodoStartedAt = null;
      progressStartedAt = null;
      reviewStartedAt = null;
      cycleHasBackflow = false;
      activeCapacityMs = 0;
      lastCapacityAt = null;
      lastCanonical = null;
    }
  });

  return cycles;
}

export function getActiveCapacitySegmentMs(
  issue: AuditIssue,
  profile: WorkflowProfile,
  nowIso: string,
): number {
  const events = getStatusEvents(issue);
  const currentStatus = issue.currentStatus || '';
  const stage = resolveWorkflowStage(profile, currentStatus);
  if (!stage.countsAsCapacityContributor) return 0;

  let enteredAt = issue.issueCreated || nowIso;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.toValue === currentStatus || e.toValue.toLowerCase() === currentStatus.toLowerCase()) {
      enteredAt = e.changedAt;
      break;
    }
  }

  const ms = getWorkingDurationMs(enteredAt, nowIso);
  return ms !== null && ms >= 0 ? ms : 0;
}

export function sumCompletedCycleCapacityHours(
  cycles: ProfileContributorCycle[],
): number {
  const totalMs = cycles.reduce((sum, c) => sum + c.activeCapacityMs, 0);
  return totalMs / 3600000;
}

export interface ProfileHoldTransition {
  changedAt: string;
  progressToHoldMs: number | null;
}

/** Profile-aware active → hold transitions used by KPI hold metrics. */
export function extractProfileHoldTransitions(
  issue: AuditIssue,
  profile: WorkflowProfile,
): ProfileHoldTransition[] {
  const transitions: ProfileHoldTransition[] = [];
  let activeStartedAt: string | null = null;
  for (const event of getStatusEvents(issue)) {
    const from = canonicalStageForStatus(profile, event.fromValue || '');
    const to = canonicalStageForStatus(profile, event.toValue || '');
    if (to === 'active') activeStartedAt = event.changedAt;
    if (from === 'active' && to === 'hold') {
      transitions.push({
        changedAt: event.changedAt,
        progressToHoldMs: activeStartedAt
          ? getWorkingDurationMs(activeStartedAt, event.changedAt)
          : null,
      });
      activeStartedAt = null;
    }
    if (to !== 'active' && to !== 'hold') activeStartedAt = null;
  }
  return transitions;
}

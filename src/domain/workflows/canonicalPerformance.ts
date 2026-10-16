import { getBusinessDurationMs, isDateWithinRange } from '../jira/dates';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import { canonicalStageForStatus, resolveWorkflowStage } from './resolveWorkflowStage';
import { isProfileBackflow } from './profileCycles';
import type { CanonicalStage, WorkflowProfile } from './types';

export interface CanonicalPerformanceCycle {
  issueKey: string;
  profileId: string;
  startedAt: string;
  completedAt: string | null;
  startedOwnerCanonical?: string;
  ownerCanonical?: string;
  executionMs: number;
  executionMsByOwner: Record<string, number>;
  cycleMs: number | null;
  reviewMs: number;
  waitingMs: number;
  holdMs: number;
  reworkMs: number;
  reviewSubmitted: boolean;
  backflowEventCount: number;
  isFirstPass: boolean;
}

function orderedEvents(issue: AuditIssue): IssueEvent[] {
  return (issue.events || [])
    .slice()
    .sort((a, b) => Date.parse(a.changedAt) - Date.parse(b.changedAt));
}

/** Resolve the assignee at an instant by reversing changes from today's assignee. */
export function assigneeAt(issue: AuditIssue, at: string): string | undefined {
  let owner = issue.currentAssigneeCanonical;
  const atMs = Date.parse(at);
  const changes = orderedEvents(issue)
    .filter((event) => event.eventType === 'Assignee')
    .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt));
  for (const change of changes) {
    if (Date.parse(change.changedAt) <= atMs) continue;
    owner = change.fromCanonical;
  }
  return owner;
}

function addsExecution(stage: CanonicalStage): boolean {
  return stage === 'active';
}

function addDuration(
  cycle: CanonicalPerformanceCycle,
  stage: CanonicalStage,
  from: string,
  to: string,
  issue: AuditIssue,
): void {
  const ms = getBusinessDurationMs(from, to) ?? 0;
  if (ms <= 0) return;
  if (addsExecution(stage)) {
    cycle.executionMs += ms;
    const owner = assigneeAt(issue, from);
    if (owner) cycle.executionMsByOwner[owner] = (cycle.executionMsByOwner[owner] ?? 0) + ms;
  } else if (stage === 'review') {
    cycle.reviewMs += ms;
  } else if (stage === 'waiting' || stage === 'qa') {
    cycle.waitingMs += ms;
  } else if (stage === 'hold') {
    cycle.holdMs += ms;
  }
}

function isRule(
  profile: WorkflowProfile,
  from: CanonicalStage,
  to: CanonicalStage,
  field: 'startsCycle' | 'completesCycle' | 'countsAsReviewSubmission',
): boolean {
  return profile.transitionRules.some((rule) => rule.from === from && rule.to === to && rule[field]);
}

function selectCycleOwner(cycle: CanonicalPerformanceCycle, issue: AuditIssue): string | undefined {
  const executionOwner = Object.entries(cycle.executionMsByOwner)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  if (executionOwner) return executionOwner;
  if (cycle.completedAt) return assigneeAt(issue, cycle.completedAt);
  return cycle.startedOwnerCanonical;
}

/**
 * Extract successful and open contributor cycles without applying a reporting-period cohort.
 * A reopen starts a new cycle; cancellation never completes one. Durations are elapsed business
 * time (Mon-Fri 09:00-17:00), not timesheet effort.
 */
export function extractCanonicalPerformanceCycles(
  issue: AuditIssue,
  profile: WorkflowProfile,
): CanonicalPerformanceCycle[] {
  const events = orderedEvents(issue);
  const cycles: CanonicalPerformanceCycle[] = [];
  let cycle: CanonicalPerformanceCycle | null = null;
  let currentStage: CanonicalStage | null = null;
  let intervalStartedAt: string | null = null;
  let reworkStartedAt: string | null = null;

  const makeCycle = (event: IssueEvent): CanonicalPerformanceCycle => {
    const next: CanonicalPerformanceCycle = {
      issueKey: issue.issueKey,
      profileId: profile.id,
      startedAt: event.changedAt,
      completedAt: null,
      startedOwnerCanonical: assigneeAt(issue, event.changedAt),
      executionMs: 0,
      executionMsByOwner: {},
      cycleMs: null,
      reviewMs: 0,
      waitingMs: 0,
      holdMs: 0,
      reworkMs: 0,
      reviewSubmitted: false,
      backflowEventCount: 0,
      isFirstPass: true,
    };
    return next;
  };

  for (const event of events) {
    if (event.eventType === 'Assignee') {
      if (cycle && currentStage && intervalStartedAt) {
        addDuration(cycle, currentStage, intervalStartedAt, event.changedAt, issue);
        intervalStartedAt = event.changedAt;
      }
      continue;
    }
    const from = canonicalStageForStatus(profile, event.fromValue || '');
    const to = canonicalStageForStatus(profile, event.toValue || '');

    if (cycle && currentStage && intervalStartedAt) {
      addDuration(cycle, currentStage, intervalStartedAt, event.changedAt, issue);
    }

    const qualifiesAsBackflow = isProfileBackflow(profile, event.fromValue, event.toValue, event);
    if (cycle && qualifiesAsBackflow) {
      cycle.backflowEventCount += 1;
      cycle.isFirstPass = false;
      reworkStartedAt = event.changedAt;
    }

    const explicitStart = isRule(profile, from, to, 'startsCycle');
    const reopened = !cycle && (from === 'done' || from === 'cancelled') && to === 'active';
    const profileReworkRestart = !cycle && qualifiesAsBackflow && to === 'active';
    const conventionalStart = !cycle && from === 'backlog' && to === 'active';
    if (!cycle && (explicitStart || reopened || conventionalStart || profileReworkRestart)) {
      cycle = makeCycle(event);
      if (profileReworkRestart) {
        cycle.backflowEventCount = 1;
        cycle.isFirstPass = false;
        reworkStartedAt = event.changedAt;
      }
      currentStage = to;
      intervalStartedAt = event.changedAt;
      if (!profileReworkRestart) reworkStartedAt = null;
      continue;
    }

    if (!cycle) {
      const completesWithoutObservedStart =
        isRule(profile, from, to, 'completesCycle') ||
        (resolveWorkflowStage(profile, event.toValue || '').isCompletion && to !== 'cancelled');
      if (completesWithoutObservedStart) {
        // Some cached/legacy Jira payloads begin after the cycle start. Count the
        // observed outcome, but do not invent a duration from issue creation.
        const partial = makeCycle(event);
        partial.completedAt = event.changedAt;
        partial.cycleMs = null;
        partial.reviewSubmitted = from === 'review' || from === 'qa';
        partial.ownerCanonical = selectCycleOwner(partial, issue);
        cycles.push(partial);
      }
      currentStage = to;
      intervalStartedAt = event.changedAt;
      continue;
    }

    if (
      (from === 'active' && (to === 'review' || to === 'waiting')) ||
      isRule(profile, from, to, 'countsAsReviewSubmission')
    ) {
      cycle.reviewSubmitted = true;
    }

    const completes =
      isRule(profile, from, to, 'completesCycle') ||
      (resolveWorkflowStage(profile, event.toValue || '').isCompletion && to !== 'cancelled');

    if (completes) {
      cycle.completedAt = event.changedAt;
      cycle.cycleMs = getBusinessDurationMs(cycle.startedAt, event.changedAt);
      if (reworkStartedAt) cycle.reworkMs = getBusinessDurationMs(reworkStartedAt, event.changedAt) ?? 0;
      cycle.ownerCanonical = selectCycleOwner(cycle, issue);
      cycles.push(cycle);
      cycle = null;
      currentStage = to;
      intervalStartedAt = event.changedAt;
      reworkStartedAt = null;
      continue;
    }

    if (to === 'cancelled') {
      cycle = null;
      reworkStartedAt = null;
    }
    currentStage = to;
    intervalStartedAt = event.changedAt;
  }

  if (cycle) {
    cycle.ownerCanonical = selectCycleOwner(cycle, issue);
    cycles.push(cycle);
  }
  return cycles;
}

export function cycleStartedInPeriod(cycle: CanonicalPerformanceCycle, params: ReportParams): boolean {
  return isDateWithinRange(cycle.startedAt, params);
}

export function cycleCompletedInPeriod(cycle: CanonicalPerformanceCycle, params: ReportParams): boolean {
  return Boolean(cycle.completedAt && isDateWithinRange(cycle.completedAt, params));
}

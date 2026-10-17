import { isDateWithinRange } from '../jira/dates';
import { DEFAULT_WORKING_CALENDAR, enumerateDateKeys } from '../calendar/workingCalendar';
import type { AuditIssue, KpiData, ReportParams } from '../jira/types';
import { isWorkflowKpiEligible } from './eligibility';
import {
  assigneeAt,
  cycleCompletedInPeriod,
  cycleStartedInPeriod,
  extractCanonicalPerformanceCycles,
  type CanonicalPerformanceCycle,
} from './canonicalPerformance';
import { isProfileBackflow } from './profileCycles';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { resolveWorkflowStage } from './resolveWorkflowStage';
import type { WorkflowProfileMapping } from './types';

const METHODOLOGY_VERSION = 2 as const;

function mean(items: number[]): number | null {
  if (!items.length) return null;
  return Math.round(items.reduce((sum, value) => sum + value, 0) / items.length);
}

export function median(items: number[]): number | null {
  if (!items.length) return null;
  const sorted = items.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function workingDays(params: ReportParams): number {
  // Working days come from the canonical calendar (Mon–Fri, no guessed holidays).
  const total = enumerateDateKeys(params.dateFrom.slice(0, 10), params.dateTo.slice(0, 10)).filter((key) =>
    DEFAULT_WORKING_CALENDAR.isWorkingDay(key),
  ).length;
  return Math.max(1, total);
}

export interface BuildWorkflowKpiOptions {
  mappings?: WorkflowProfileMapping[];
  /** Restrict attribution to one canonical contributor for person-level KPI. */
  contributorCanonical?: string;
  /** Restrict attributed cycles/events to a team or hierarchy scope. */
  contributorCanonicals?: Set<string>;
}

function emptyKpi(targetReviewDays: number): KpiData {
  return {
    methodologyVersion: METHODOLOGY_VERSION,
    startedCount: 0, reviewSubmittedCount: 0, completedCount: 0,
    firstPassAcceptedCount: 0, reworkedCycleCount: 0, backflowEventCount: 0,
    holdCount: 0,
    firstPassRatePercent: null, reworkRatePercent: null,
    throughputCount: 0, throughputPerWorkingDay: 0,
    medianExecutionMs: null, meanExecutionMs: null, executionSampleCount: 0,
    medianCycleMs: null, meanCycleMs: null, cycleSampleCount: 0,
    medianReviewMs: null, meanReviewMs: null, reviewSampleCount: 0,
    medianReworkMs: null, meanReworkMs: null, reworkDurationSampleCount: 0,
    medianHoldMs: null, holdDurationSampleCount: 0,
    medianWaitingMs: null, waitingDurationSampleCount: 0,
    profileBreakdown: {},
    avgProgressToReviewMs: null, avgReviewToDoneMs: null,
    avgProgressToHoldMs: null, avgTodoToApprovedMs: null,
    targetReviewDays,
  };
}

export function attributedTo(cycle: CanonicalPerformanceCycle, canonical?: string): boolean {
  // Older Jira snapshots do not always contain enough assignee history to
  // reconstruct an owner. In a person-scoped issue list, retain that cycle as
  // an explicitly unattributed fallback instead of silently dropping it.
  return !canonical || !cycle.ownerCanonical || cycle.ownerCanonical === canonical;
}

export function ownerAllowed(owner: string | undefined, options: BuildWorkflowKpiOptions): boolean {
  if (!owner) return true;
  if (options.contributorCanonical) return owner === options.contributorCanonical;
  if (options.contributorCanonicals) return options.contributorCanonicals.has(owner);
  return true;
}

/**
 * The single rule for which completed cycles belong to a contributor/scope in a period. Person
 * KPIs and the person Work History evidence list both use it, so a cycle is counted (and listed)
 * under its canonical owner only, and the two always reconcile.
 */
export function isAttributedCompletedCycle(
  cycle: CanonicalPerformanceCycle,
  params: ReportParams,
  options: BuildWorkflowKpiOptions = {},
): boolean {
  return cycleCompletedInPeriod(cycle, params) &&
    attributedTo(cycle, options.contributorCanonical) &&
    ownerAllowed(cycle.ownerCanonical, options);
}

export function buildWorkflowKpi(
  issues: AuditIssue[],
  params: ReportParams,
  options: BuildWorkflowKpiOptions = {},
): KpiData {
  const targetReviewDays = Number(params?.targetReviewDays ?? 3);
  const uniqueIssues = [...new Map((issues || []).map((issue) => [issue.issueKey, issue])).values()]
    .filter(isWorkflowKpiEligible);
  if (!uniqueIssues.length) return emptyKpi(targetReviewDays);

  const execution: number[] = [];
  const cycleDurations: number[] = [];
  const review: number[] = [];
  const rework: number[] = [];
  const hold: number[] = [];
  const waiting: number[] = [];
  const completedCycles: CanonicalPerformanceCycle[] = [];
  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let holdCount = 0;
  let backflowEventCount = 0;

  const profileSamples = new Map<string, {
    label: string;
    starts: number;
    cycles: CanonicalPerformanceCycle[];
    backflows: number;
  }>();

  for (const issue of uniqueIssues) {
    const profile = resolveWorkflowProfile(issue, options);
    const cycles = extractCanonicalPerformanceCycles(issue, profile);
    const profileRow = profileSamples.get(profile.id) ?? {
      label: profile.label, starts: 0, cycles: [], backflows: 0,
    };

    for (const cycle of cycles) {
      if (cycleStartedInPeriod(cycle, params) &&
          ownerAllowed(cycle.startedOwnerCanonical, options)) {
        startedCount += 1;
        profileRow.starts += 1;
      }
      if (!isAttributedCompletedCycle(cycle, params, options)) continue;
      completedCycles.push(cycle);
      profileRow.cycles.push(cycle);
      if (cycle.reviewSubmitted) reviewSubmittedCount += 1;
      const ownedExecution = options.contributorCanonical
        ? (cycle.executionMsByOwner[options.contributorCanonical] ?? 0)
        : cycle.executionMs;
      if (ownedExecution > 0) execution.push(ownedExecution);
      if (cycle.cycleMs !== null) cycleDurations.push(cycle.cycleMs);
      if (cycle.reviewMs > 0) review.push(cycle.reviewMs);
      if (cycle.reworkMs > 0) rework.push(cycle.reworkMs);
      if (cycle.holdMs > 0) hold.push(cycle.holdMs);
      if (cycle.waitingMs > 0) waiting.push(cycle.waitingMs);
    }

    for (const event of issue.events || []) {
      if (event.eventType !== 'Status' || !isDateWithinRange(event.changedAt, params)) continue;
      const eventOwner = assigneeAt(issue, event.changedAt);
      if (isProfileBackflow(profile, event.fromValue, event.toValue, event) &&
          ownerAllowed(eventOwner, options)) {
        backflowEventCount += 1;
        profileRow.backflows += 1;
      }
      const destination = resolveWorkflowStage(profile, event.toValue);
      if (destination.canonicalStage === 'hold' && !destination.isCompletion &&
          ownerAllowed(eventOwner, options)) {
        holdCount += 1;
      }
    }
    profileSamples.set(profile.id, profileRow);
  }

  const completedCount = completedCycles.length;
  const reworkedCycleCount = completedCycles.filter((cycle) => cycle.backflowEventCount > 0).length;
  const firstPassAcceptedCount = completedCount - reworkedCycleCount;
  const firstPassRatePercent = completedCount
    ? Math.round((firstPassAcceptedCount / completedCount) * 10000) / 100 : null;
  const reworkRatePercent = completedCount
    ? Math.round((reworkedCycleCount / completedCount) * 10000) / 100 : null;

  const profileBreakdown: KpiData['profileBreakdown'] = {};
  for (const [profileId, row] of profileSamples) {
    const profileExecution = row.cycles.map((cycle) => cycle.executionMs).filter((ms) => ms > 0);
    const profileCycle = row.cycles.map((cycle) => cycle.cycleMs).filter((ms): ms is number => ms !== null);
    const profileReworked = row.cycles.filter((cycle) => cycle.backflowEventCount > 0).length;
    profileBreakdown[profileId] = {
      label: row.label,
      startedCount: row.starts,
      completedCount: row.cycles.length,
      firstPassCount: row.cycles.length - profileReworked,
      reworkedCycleCount: profileReworked,
      backflowEventCount: row.backflows,
      medianExecutionMs: median(profileExecution),
      medianCycleMs: median(profileCycle),
      sampleCount: row.cycles.length,
    };
  }

  return {
    methodologyVersion: METHODOLOGY_VERSION,
    startedCount, reviewSubmittedCount, completedCount, firstPassAcceptedCount,
    reworkedCycleCount, backflowEventCount, holdCount,
    firstPassRatePercent, reworkRatePercent,
    throughputCount: completedCount,
    throughputPerWorkingDay: Math.round((completedCount / workingDays(params)) * 100) / 100,
    medianExecutionMs: median(execution), meanExecutionMs: mean(execution), executionSampleCount: execution.length,
    medianCycleMs: median(cycleDurations), meanCycleMs: mean(cycleDurations), cycleSampleCount: cycleDurations.length,
    medianReviewMs: median(review), meanReviewMs: mean(review), reviewSampleCount: review.length,
    medianReworkMs: median(rework), meanReworkMs: mean(rework), reworkDurationSampleCount: rework.length,
    medianHoldMs: median(hold), holdDurationSampleCount: hold.length,
    medianWaitingMs: median(waiting), waitingDurationSampleCount: waiting.length,
    profileBreakdown,
    avgProgressToReviewMs: mean(execution),
    avgReviewToDoneMs: mean(review),
    avgProgressToHoldMs: mean(hold),
    avgTodoToApprovedMs: mean(cycleDurations),
    targetReviewDays,
  };
}

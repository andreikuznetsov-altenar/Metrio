import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  getWorkingDurationMs,
  isDateWithinRange,
  parseDateEndOfDay,
  parseDateStartOfDay,
} from '../jira/dates';
import type { AuditIssue, IssueEvent, ReportParams } from '../jira/types';
import type { WorkloadLevel } from '../workload/workloadEngine';
import { isWorkflowCapacityEligible } from './eligibility';
import { extractProfileContributorCycles } from './profileCycles';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { canonicalStageForStatus, resolveWorkflowStage } from './resolveWorkflowStage';
import type { WorkflowProfile, WorkflowProfileMapping } from './types';

import { appNow } from "../../platform/appClock";

export const MONTHLY_CAPACITY_HOURS = 164;

export type CapacityDataState = 'measured' | 'insufficient_history';

export function resolveCapacityDataState(completedCyclesInPeriod: number): CapacityDataState {
  return completedCyclesInPeriod > 0 ? 'measured' : 'insufficient_history';
}

export interface CapacityBreakdown {
  completedCycleHours: number;
  activeSegmentHours: number;
  avgHoursPerCycle: number;
  completedCyclesInPeriod: number;
  daysInPeriod: number;
  monthlyQuantity: number;
  estimatedMonthlyHours: number;
  capacityLoadPercent: number;
  capacityDataState: CapacityDataState;
}

export interface CapacityWorkloadInput {
  issues: AuditIssue[];
  params: ReportParams;
  mappings?: WorkflowProfileMapping[];
  now?: Date;
}

interface CapacityInterval {
  startMs: number;
  endMs: number;
}

interface AssignmentSegment extends CapacityInterval {
  canonical: string | null;
}

function uniqueEligibleIssues(issues: AuditIssue[]): AuditIssue[] {
  const byKey = new Map<string, AuditIssue>();
  issues.filter(isWorkflowCapacityEligible).forEach((issue) => {
    if (!byKey.has(issue.issueKey)) byKey.set(issue.issueKey, issue);
  });
  return [...byKey.values()];
}

function validMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function normalized(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function inferCurrentCanonicalFromRaw(issue: AuditIssue, raw: string | undefined): string | null {
  const canonical = issue.currentAssigneeCanonical;
  if (!canonical || !raw) return null;
  const wanted = normalized(raw);
  const candidates = [
    issue.currentAssigneeCanonical,
    issue.currentAssigneeAccountId,
    issue.currentAssigneeDisplayName,
    issue.assigneeName,
  ].map(normalized).filter(Boolean);
  return candidates.includes(wanted) ? canonical : null;
}

function sortedAssigneeEvents(issue: AuditIssue): IssueEvent[] {
  return (issue.events || [])
    .filter((event) => event.eventType === 'Assignee')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

function sortedStatusEvents(issue: AuditIssue): IssueEvent[] {
  return (issue.events || [])
    .filter((event) => event.eventType === 'Status')
    .slice()
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

function assignmentSegments(issue: AuditIssue, throughMs: number): AssignmentSegment[] {
  const events = sortedAssigneeEvents(issue);
  const createdMs = validMs(issue.issueCreated) ?? (events[0] ? validMs(events[0].changedAt) : null) ?? throughMs;

  if (events.length === 0) {
    return [{
      startMs: createdMs,
      endMs: throughMs,
      canonical: issue.currentAssigneeCanonical || null,
    }];
  }

  const first = events[0];
  let currentCanonical =
    first.fromCanonical ||
    inferCurrentCanonicalFromRaw(issue, first.fromValue);
  let cursor = createdMs;
  const segments: AssignmentSegment[] = [];

  for (const event of events) {
    const at = validMs(event.changedAt);
    if (at === null) continue;
    if (at > cursor) {
      segments.push({
        startMs: cursor,
        endMs: Math.min(at, throughMs),
        canonical: currentCanonical || null,
      });
    }
    currentCanonical =
      event.toCanonical ||
      inferCurrentCanonicalFromRaw(issue, event.toValue);
    cursor = Math.max(cursor, at);
    if (cursor >= throughMs) break;
  }

  if (cursor < throughMs) {
    segments.push({
      startMs: cursor,
      endMs: throughMs,
      canonical: currentCanonical || issue.currentAssigneeCanonical || null,
    });
  }

  return segments.filter((segment) => segment.endMs > segment.startMs);
}

function reportRangeMs(params: ReportParams): { startMs: number | null; endMs: number | null } {
  return {
    startMs: parseDateStartOfDay(params.dateFrom)?.getTime() ?? null,
    endMs: parseDateEndOfDay(params.dateTo)?.getTime() ?? null,
  };
}

function clipInterval(
  interval: CapacityInterval,
  window: CapacityInterval,
  params?: ReportParams,
): CapacityInterval | null {
  const range = params ? reportRangeMs(params) : { startMs: null, endMs: null };
  const startMs = Math.max(
    interval.startMs,
    window.startMs,
    range.startMs ?? Number.NEGATIVE_INFINITY,
  );
  const endMs = Math.min(
    interval.endMs,
    window.endMs,
    range.endMs ?? Number.POSITIVE_INFINITY,
  );
  return endMs > startMs ? { startMs, endMs } : null;
}

function contributorStatusIntervals(
  issue: AuditIssue,
  profile: WorkflowProfile,
  throughMs: number,
): CapacityInterval[] {
  const events = sortedStatusEvents(issue);
  const intervals: CapacityInterval[] = [];
  const createdMs = validMs(issue.issueCreated) ?? throughMs;

  if (events.length === 0) {
    const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
    return stage.countsAsCapacityContributor && throughMs > createdMs
      ? [{ startMs: createdMs, endMs: throughMs }]
      : [];
  }

  const firstAt = validMs(events[0].changedAt);
  if (firstAt !== null && firstAt > createdMs) {
    const initialStage = resolveWorkflowStage(profile, events[0].fromValue || '');
    if (initialStage.countsAsCapacityContributor) {
      intervals.push({ startMs: createdMs, endMs: Math.min(firstAt, throughMs) });
    }
  }

  events.forEach((event, index) => {
    const startMs = validMs(event.changedAt);
    if (startMs === null || startMs >= throughMs) return;
    const nextMs =
      index + 1 < events.length
        ? validMs(events[index + 1].changedAt) ?? throughMs
        : throughMs;
    const endMs = Math.min(nextMs, throughMs);
    const stage = resolveWorkflowStage(profile, event.toValue || '');
    if (stage.countsAsCapacityContributor && endMs > startMs) {
      intervals.push({ startMs, endMs });
    }
  });

  return intervals;
}

function intersectWithSubjectAssignments(
  intervals: CapacityInterval[],
  issue: AuditIssue,
  subjectCanonical: string | undefined,
  throughMs: number,
): CapacityInterval[] {
  if (!subjectCanonical) return intervals;
  const assignments = assignmentSegments(issue, throughMs);
  const out: CapacityInterval[] = [];

  for (const interval of intervals) {
    for (const assignment of assignments) {
      if (assignment.canonical !== subjectCanonical) continue;
      const startMs = Math.max(interval.startMs, assignment.startMs);
      const endMs = Math.min(interval.endMs, assignment.endMs);
      if (endMs > startMs) out.push({ startMs, endMs });
    }
  }

  return out;
}

function contributorIntervalsForWindow(
  issue: AuditIssue,
  profile: WorkflowProfile,
  window: CapacityInterval,
  throughMs: number,
  params?: ReportParams,
): CapacityInterval[] {
  const subjectCanonical = issue.currentAssigneeCanonical;
  const statusIntervals = contributorStatusIntervals(issue, profile, throughMs);
  const assigned = intersectWithSubjectAssignments(
    statusIntervals,
    issue,
    subjectCanonical,
    throughMs,
  );
  return assigned
    .map((interval) => clipInterval(interval, window, params))
    .filter((interval): interval is CapacityInterval => Boolean(interval));
}

function mergeIntervals(intervals: CapacityInterval[]): CapacityInterval[] {
  const sorted = intervals
    .filter((interval) => interval.endMs > interval.startMs)
    .slice()
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  if (sorted.length === 0) return [];

  const merged: CapacityInterval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const previous = merged[merged.length - 1];
    if (current.startMs <= previous.endMs) {
      previous.endMs = Math.max(previous.endMs, current.endMs);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function businessDurationMs(intervals: CapacityInterval[]): number {
  return mergeIntervals(intervals).reduce((sum, interval) => {
    const ms = getWorkingDurationMs(
      new Date(interval.startMs).toISOString(),
      new Date(interval.endMs).toISOString(),
    );
    return sum + Math.max(0, ms ?? 0);
  }, 0);
}

function subjectBucketKey(issue: AuditIssue): string {
  return issue.currentAssigneeCanonical || `issue:${issue.issueKey}`;
}

function sumBusinessDurationBySubject(
  intervalsBySubject: Map<string, CapacityInterval[]>,
): number {
  let total = 0;
  intervalsBySubject.forEach((intervals) => {
    total += businessDurationMs(intervals);
  });
  return total;
}

export function daysInReportingPeriod(params: ReportParams): number {
  const from = parseISO(params.dateFrom);
  const to = parseISO(params.dateTo);
  const diff = differenceInCalendarDays(to, from);
  return Math.max(1, diff + 1);
}

export function capacityLevelFromPercent(loadPercent: number): WorkloadLevel {
  if (loadPercent > 100) return 'overloaded';
  if (loadPercent >= 85) return 'high';
  if (loadPercent >= 50) return 'normal';
  return 'low';
}

export function hasCurrentOperationalCapacitySource(
  operational: ReturnType<typeof countOperationalWorkload>,
  activeSegmentHours: number,
): boolean {
  return operational.capacityContributorIssueCount > 0 || activeSegmentHours > 0;
}

/**
 * Historical capacity presentation only. Current workload classification is
 * resolved separately from the present Jira queue in workloadEngine.ts.
 */
export function resolveCurrentOperationalCapacityPresentation(
  capacityBreakdown: CapacityBreakdown,
  operational: ReturnType<typeof countOperationalWorkload>,
): {
  capacityLoadPercent: number;
  capacityDataState: CapacityDataState;
  level: WorkloadLevel;
} {
  const hasCurrentSource = hasCurrentOperationalCapacitySource(
    operational,
    capacityBreakdown.activeSegmentHours,
  );

  if (!hasCurrentSource) {
    return {
      capacityLoadPercent: 0,
      capacityDataState: capacityBreakdown.capacityDataState,
      level: 'low',
    };
  }

  if (capacityBreakdown.capacityDataState !== 'measured') {
    return {
      capacityLoadPercent: capacityBreakdown.capacityLoadPercent,
      capacityDataState: capacityBreakdown.capacityDataState,
      level: 'normal',
    };
  }

  return {
    capacityLoadPercent: capacityBreakdown.capacityLoadPercent,
    capacityDataState: capacityBreakdown.capacityDataState,
    level: capacityLevelFromPercent(capacityBreakdown.capacityLoadPercent),
  };
}

export function calculateCapacityBreakdown(input: CapacityWorkloadInput): CapacityBreakdown {
  const { issues, params } = input;
  const now = input.now || appNow();
  const nowMs = now.getTime();
  const daysInPeriod = daysInReportingPeriod(params);

  let completedCyclesInPeriod = 0;
  const completedIntervalsBySubject = new Map<string, CapacityInterval[]>();
  const activeIntervalsBySubject = new Map<string, CapacityInterval[]>();

  uniqueEligibleIssues(issues).forEach((issue) => {
    const profile = resolveWorkflowProfile(issue, { mappings: input.mappings });
    const cycles = extractProfileContributorCycles(issue, profile, params).filter(
      (cycle) => cycle.completedAt && isDateWithinRange(cycle.completedAt, params),
    );
    const bucketKey = subjectBucketKey(issue);

    cycles.forEach((cycle) => {
      const cycleStartMs = validMs(cycle.startedAt);
      const cycleEndMs = validMs(cycle.completedAt);
      if (cycleStartMs === null || cycleEndMs === null || cycleEndMs <= cycleStartMs) return;
      const intervals = contributorIntervalsForWindow(
        issue,
        profile,
        { startMs: cycleStartMs, endMs: cycleEndMs },
        cycleEndMs,
        params,
      );
      if (businessDurationMs(intervals) <= 0) return;
      completedCyclesInPeriod += 1;
      const bucket = completedIntervalsBySubject.get(bucketKey) || [];
      bucket.push(...intervals);
      completedIntervalsBySubject.set(bucketKey, bucket);
    });

    const currentStage = resolveWorkflowStage(profile, issue.currentStatus || '');
    if (currentStage.countsAsCapacityContributor) {
      const statusEvents = sortedStatusEvents(issue);
      let enteredAtMs = validMs(issue.issueCreated) ?? nowMs;
      for (let i = statusEvents.length - 1; i >= 0; i -= 1) {
        const event = statusEvents[i];
        if (
          canonicalStageForStatus(profile, event.toValue || '') === currentStage.canonicalStage
        ) {
          enteredAtMs = validMs(event.changedAt) ?? enteredAtMs;
          break;
        }
      }
      const intervals = contributorIntervalsForWindow(
        issue,
        profile,
        { startMs: enteredAtMs, endMs: nowMs },
        nowMs,
      );
      const bucket = activeIntervalsBySubject.get(bucketKey) || [];
      bucket.push(...intervals);
      activeIntervalsBySubject.set(bucketKey, bucket);
    }
  });

  const completedCycleHours =
    sumBusinessDurationBySubject(completedIntervalsBySubject) / 3600000;
  const activeSegmentHours =
    sumBusinessDurationBySubject(activeIntervalsBySubject) / 3600000;

  const avgHoursPerCycle =
    completedCyclesInPeriod > 0 ? completedCycleHours / completedCyclesInPeriod : activeSegmentHours;

  const monthlyQuantity = (completedCyclesInPeriod / daysInPeriod) * 30;
  const estimatedMonthlyHours = monthlyQuantity * avgHoursPerCycle;
  const capacityLoadPercent =
    MONTHLY_CAPACITY_HOURS > 0
      ? Math.round((estimatedMonthlyHours / MONTHLY_CAPACITY_HOURS) * 1000) / 10
      : 0;

  return {
    completedCycleHours,
    activeSegmentHours,
    avgHoursPerCycle,
    completedCyclesInPeriod,
    daysInPeriod,
    monthlyQuantity,
    estimatedMonthlyHours: Math.round(estimatedMonthlyHours * 10) / 10,
    capacityLoadPercent,
    capacityDataState: resolveCapacityDataState(completedCyclesInPeriod),
  };
}

export function countOperationalWorkload(
  issues: AuditIssue[],
  _params: ReportParams,
  mappings?: WorkflowProfileMapping[],
): {
  currentAssignedIssueCount: number;
  activeWorkCount: number;
  reviewCount: number;
  qaCount: number;
  waitingCount: number;
  holdCount: number;
  backlogCount: number;
  unknownCount: number;
  capacityContributorIssueCount: number;
} {
  let activeWorkCount = 0;
  let reviewCount = 0;
  let qaCount = 0;
  let waitingCount = 0;
  let holdCount = 0;
  let backlogCount = 0;
  let unknownCount = 0;
  let capacityContributorIssueCount = 0;
  let currentAssignedIssueCount = 0;

  uniqueEligibleIssues(issues).forEach((issue) => {
    const profile = resolveWorkflowProfile(issue, { mappings });
    const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
    if (stage.isCompletion || stage.isTerminal || stage.canonicalStage === 'cancelled') return;
    currentAssignedIssueCount++;
    if (stage.countsAsActiveWork) activeWorkCount++;
    if (stage.countsAsReview) reviewCount++;
    if (stage.countsAsQa) qaCount++;
    if (stage.countsAsWaiting) waitingCount++;
    if (stage.countsAsHold) holdCount++;
    if (stage.canonicalStage === 'backlog') backlogCount++;
    if (stage.canonicalStage === 'unknown') unknownCount++;
    if (stage.countsAsCapacityContributor) capacityContributorIssueCount++;
  });

  return {
    currentAssignedIssueCount,
    activeWorkCount,
    reviewCount,
    qaCount,
    waitingCount,
    holdCount,
    backlogCount,
    unknownCount,
    capacityContributorIssueCount,
  };
}

export function requiredHeadcount(capacityLoadPercent: number): number {
  if (capacityLoadPercent <= 100) return 1;
  return Math.ceil(capacityLoadPercent / 100);
}

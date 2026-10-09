import { differenceInCalendarDays, parseISO } from 'date-fns';
import { isDateWithinRange } from '../jira/dates';
import type { AuditIssue, ReportParams } from '../jira/types';
import type { WorkloadLevel } from '../workload/workloadEngine';
import { isWorkflowCapacityEligible } from './eligibility';
import { extractProfileContributorCycles, getActiveCapacitySegmentMs } from './profileCycles';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import { resolveWorkflowStage } from './resolveWorkflowStage';
import type { WorkflowProfileMapping } from './types';

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

function uniqueEligibleIssues(issues: AuditIssue[]): AuditIssue[] {
  const byKey = new Map<string, AuditIssue>();
  issues.filter(isWorkflowCapacityEligible).forEach((issue) => {
    if (!byKey.has(issue.issueKey)) byKey.set(issue.issueKey, issue);
  });
  return [...byKey.values()];
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

/** Current profile load — historical completed cycles alone must not inflate live workload. */
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
  const now = input.now || new Date();
  const nowIso = now.toISOString();
  const daysInPeriod = daysInReportingPeriod(params);

  let completedCyclesInPeriod = 0;
  let completedCycleHours = 0;
  let activeSegmentHours = 0;

  uniqueEligibleIssues(issues).forEach((issue) => {
    const profile = resolveWorkflowProfile(issue, { mappings: input.mappings });
    const cycles = extractProfileContributorCycles(issue, profile, params).filter(
      (cycle) => cycle.completedAt && isDateWithinRange(cycle.completedAt, params),
    );
    cycles.forEach((cycle) => {
      // A completed workflow cycle is only a capacity sample when execution
      // contributor time was actually observed inside the report window.
      // Pre-period In Progress must not inflate monthly load.
      const capacityMs = cycle.activeCapacityMsInPeriod;
      if (capacityMs <= 0) return;
      completedCyclesInPeriod++;
      completedCycleHours += capacityMs / 3600000;
    });
    activeSegmentHours += getActiveCapacitySegmentMs(issue, profile, nowIso) / 3600000;
  });

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
    currentAssignedIssueCount++;
    const profile = resolveWorkflowProfile(issue, { mappings });
    const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
    if (stage.isCompletion || stage.canonicalStage === 'cancelled') return;
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

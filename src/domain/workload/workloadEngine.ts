import type { AuditIssue, ReportParams } from '../jira/types';
import type { PersonAvailability } from '../people/types';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import {
  calculateCapacityBreakdown,
  capacityLevelFromPercent,
  countOperationalWorkload,
  MONTHLY_CAPACITY_HOURS,
  requiredHeadcount,
  type CapacityDataState,
} from '../workflows/capacityWorkload';
import type { WorkflowProfileMapping } from '../workflows/types';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
import { isWorkflowCapacityEligible } from '../workflows/eligibility';
import { isActiveWorkloadStatus } from '../workflows/workloadStatusClassification';

export type WorkloadLevel = 'low' | 'normal' | 'high' | 'overloaded';

export interface WorkloadThresholds {
  /** Weighted workload score threshold for High level. */
  highScore: number;
  /** Weighted workload score threshold for Overloaded level. */
  overloadedScore: number;
  highInProgress: number;
  problematicWeight: number;
  atRiskWeight: number;
  overdueWeight: number;
}

export const DEFAULT_WORKLOAD_THRESHOLDS: WorkloadThresholds = {
  highScore: 6,
  overloadedScore: 10,
  highInProgress: 3,
  problematicWeight: 2,
  atRiskWeight: 1,
  overdueWeight: 2,
};

export function normalizeWorkloadThresholds(
  raw: Partial<WorkloadThresholds> & {
    highActiveTasks?: number;
    overloadedActiveTasks?: number;
  } = {},
): WorkloadThresholds {
  return {
    ...DEFAULT_WORKLOAD_THRESHOLDS,
    ...raw,
    highScore: raw.highScore ?? raw.highActiveTasks ?? DEFAULT_WORKLOAD_THRESHOLDS.highScore,
    overloadedScore:
      raw.overloadedScore ?? raw.overloadedActiveTasks ?? DEFAULT_WORKLOAD_THRESHOLDS.overloadedScore,
  };
}

export function isIssueActive(
  issue: AuditIssue,
  _params: ReportParams,
  mappings?: WorkflowProfileMapping[],
): boolean {
  if (!isWorkflowCapacityEligible(issue)) {
    return false;
  }
  const profile = resolveWorkflowProfile(issue, { mappings });
  const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
  if (stage.isTerminal || stage.isCompletion) return false;
  return isActiveWorkloadStatus(issue, mappings);
}

export function countActiveIssues(
  issues: AuditIssue[],
  params: ReportParams,
  mappings?: WorkflowProfileMapping[],
): number {
  return issues.filter((issue) => isIssueActive(issue, params, mappings)).length;
}

export interface WorkloadResult {
  level: WorkloadLevel;
  /** Legacy score field — mirrors capacityLoadPercent when capacity model is used. */
  score: number;
  activeCount: number;
  inProgressCount: number;
  inReviewCount: number;
  problematicCount: number;
  atRiskCount: number;
  overdueCount: number;
  summary: string;
  capacityLoadPercent?: number;
  estimatedMonthlyHours?: number;
  monthlyCapacityHours?: number;
  requiredHeadcount?: number;
  currentAssignedIssueCount?: number;
  activeWorkCount?: number;
  reviewCount?: number;
  qaCount?: number;
  waitingCount?: number;
  holdCount?: number;
  backlogCount?: number;
  unknownCount?: number;
  capacityContributorIssueCount?: number;
  capacityBreakdown?: ReturnType<typeof calculateCapacityBreakdown>;
  capacityDataState?: CapacityDataState;
}

function isOnVacation(availability?: PersonAvailability): boolean {
  if (!availability) return false;
  return (
    availability.state === 'on_vacation' ||
    availability.state === 'returns_today' ||
    availability.isHoliday
  );
}

export interface CalculateWorkloadOptions {
  mappings?: WorkflowProfileMapping[];
  now?: Date;
}

export function calculateWorkload(
  issues: AuditIssue[],
  params: ReportParams,
  _thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
  availability?: PersonAvailability,
  options: CalculateWorkloadOptions = {},
): WorkloadResult {
  if (isOnVacation(availability)) {
    return {
      level: 'low',
      score: 0,
      activeCount: 0,
      inProgressCount: 0,
      inReviewCount: 0,
      problematicCount: 0,
      atRiskCount: 0,
      overdueCount: 0,
      summary: availability?.label || 'Away',
      capacityLoadPercent: 0,
      estimatedMonthlyHours: 0,
      monthlyCapacityHours: MONTHLY_CAPACITY_HOURS,
      requiredHeadcount: 1,
      currentAssignedIssueCount: 0,
      activeWorkCount: 0,
      reviewCount: 0,
      qaCount: 0,
      waitingCount: 0,
      holdCount: 0,
      backlogCount: 0,
      unknownCount: 0,
      capacityContributorIssueCount: 0,
      capacityDataState: 'insufficient_history',
    };
  }

  const uniqueIssues = [
    ...new Map(issues.map((issue) => [issue.issueKey, issue])).values(),
  ];
  let problematicCount = 0;
  let atRiskCount = 0;
  let overdueCount = 0;
  let inProgressCount = 0;

  uniqueIssues.forEach((issue) => {
    const health = classifyTaskHealth({ issue, params });
    if (health.isCompleted) return;

    const profile = resolveWorkflowProfile(issue, { mappings: options.mappings });
    const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
    if (stage.canonicalStage === 'active') inProgressCount++;
    if (health.status === 'problematic') problematicCount++;
    if (health.status === 'at_risk') atRiskCount++;
    if (health.reasons.some((r) => r.includes('exceeded'))) overdueCount++;
  });

  const operational = countOperationalWorkload(uniqueIssues, params, options.mappings);
  const activeCount = countActiveIssues(uniqueIssues, params, options.mappings);
  const capacityBreakdown = calculateCapacityBreakdown({
    issues: uniqueIssues,
    params,
    mappings: options.mappings,
    now: options.now,
  });
  const capacityDataState = capacityBreakdown.capacityDataState;
  const level =
    capacityDataState === 'measured'
      ? capacityLevelFromPercent(capacityBreakdown.capacityLoadPercent)
      : 'normal';

  const levelLabel =
    capacityDataState === 'measured'
      ? level === 'low'
        ? 'Low'
        : level === 'normal'
          ? 'Balanced'
          : level === 'high'
            ? 'High'
            : 'Overloaded'
      : 'Not enough history';

  const capacityNote =
    capacityDataState === 'measured' && capacityBreakdown.estimatedMonthlyHours > 0
      ? ` · ~${capacityBreakdown.estimatedMonthlyHours}h/mo (${capacityBreakdown.capacityLoadPercent}% of ${MONTHLY_CAPACITY_HOURS}h)`
      : capacityDataState === 'insufficient_history'
        ? ' · capacity not measured (no completed cycles in period)'
        : '';

  return {
    level,
    score: capacityBreakdown.capacityLoadPercent,
    activeCount,
    inProgressCount,
    inReviewCount: operational.reviewCount,
    problematicCount,
    atRiskCount,
    overdueCount,
    summary: `${levelLabel} workload · ${activeCount} active · ${inProgressCount} in progress · ${problematicCount} problematic${capacityNote}`,
    capacityLoadPercent: capacityBreakdown.capacityLoadPercent,
    estimatedMonthlyHours: capacityBreakdown.estimatedMonthlyHours,
    monthlyCapacityHours: MONTHLY_CAPACITY_HOURS,
    requiredHeadcount: requiredHeadcount(capacityBreakdown.capacityLoadPercent),
    currentAssignedIssueCount: operational.currentAssignedIssueCount,
    activeWorkCount: operational.activeWorkCount,
    reviewCount: operational.reviewCount,
    qaCount: operational.qaCount,
    waitingCount: operational.waitingCount,
    holdCount: operational.holdCount,
    backlogCount: operational.backlogCount,
    unknownCount: operational.unknownCount,
    capacityContributorIssueCount: operational.capacityContributorIssueCount,
    capacityBreakdown,
    capacityDataState,
  };
}

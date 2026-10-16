import type { AuditIssue, ReportParams } from '../jira/types';
import type { PersonAvailability } from '../people/types';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import {
  calculateCapacityBreakdown,
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
  /** Weighted current Jira queue score threshold for High level. */
  highScore: number;
  /** Weighted current Jira queue score threshold for Overloaded level. */
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
  /** Weighted score of the current Jira queue; historical cycle duration is not part of it. */
  score: number;
  activeCount: number;
  inProgressCount: number;
  inReviewCount: number;
  problematicCount: number;
  atRiskCount: number;
  overdueCount: number;
  summary: string;
  /** Historical elapsed-business-time capacity metric, kept separate from current workload. */
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

function currentQueueScore(
  operational: ReturnType<typeof countOperationalWorkload>,
  counts: {
    problematicCount: number;
    atRiskCount: number;
    overdueCount: number;
  },
  thresholds: WorkloadThresholds,
): number {
  // Current queue stages deliberately carry different weights. Review/QA still
  // consume attention, while waiting/hold/backlog are weaker load signals than
  // hands-on active execution.
  const stageScore =
    operational.activeWorkCount +
    operational.reviewCount * 0.5 +
    operational.qaCount * 0.5 +
    operational.waitingCount * 0.25 +
    operational.holdCount * 0.1 +
    operational.backlogCount * 0.25 +
    operational.unknownCount * 0.25;

  const riskScore =
    counts.problematicCount * thresholds.problematicWeight +
    counts.atRiskCount * thresholds.atRiskWeight +
    counts.overdueCount * thresholds.overdueWeight;

  return Math.round((stageScore + riskScore) * 10) / 10;
}

function currentQueueLevel(
  score: number,
  operational: ReturnType<typeof countOperationalWorkload>,
  counts: {
    problematicCount: number;
    atRiskCount: number;
  },
  thresholds: WorkloadThresholds,
): WorkloadLevel {
  if (operational.currentAssignedIssueCount === 0) return 'low';

  if (score >= thresholds.overloadedScore || counts.problematicCount >= 3) {
    return 'overloaded';
  }

  if (
    score >= thresholds.highScore ||
    operational.activeWorkCount >= thresholds.highInProgress
  ) {
    return 'high';
  }

  if (
    score < 3 &&
    operational.activeWorkCount <= 1 &&
    counts.problematicCount === 0 &&
    counts.atRiskCount === 0
  ) {
    return 'low';
  }

  return 'normal';
}

function workloadLevelLabel(level: WorkloadLevel): string {
  if (level === 'low') return 'Light';
  if (level === 'high') return 'High';
  if (level === 'overloaded') return 'Overloaded';
  return 'Balanced';
}

export function calculateWorkload(
  issues: AuditIssue[],
  params: ReportParams,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
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
  const score = currentQueueScore(
    operational,
    { problematicCount, atRiskCount, overdueCount },
    thresholds,
  );
  const level = currentQueueLevel(
    score,
    operational,
    { problematicCount, atRiskCount },
    thresholds,
  );

  // Historical capacity remains available for analytics, but it is explicitly
  // not allowed to drive today's Light/Balanced/High/Overloaded badge.
  const capacityBreakdown = calculateCapacityBreakdown({
    issues: uniqueIssues,
    params,
    mappings: options.mappings,
    now: options.now,
  });
  const capacityDataState = capacityBreakdown.capacityDataState;
  const capacityLoadPercent = capacityBreakdown.capacityLoadPercent;

  const details = [
    `${operational.currentAssignedIssueCount} assigned`,
    `${operational.activeWorkCount} active`,
    operational.reviewCount ? `${operational.reviewCount} review` : '',
    operational.holdCount ? `${operational.holdCount} hold` : '',
    problematicCount ? `${problematicCount} problematic` : '',
  ].filter(Boolean).join(' · ');

  return {
    level,
    score,
    activeCount,
    inProgressCount,
    inReviewCount: operational.reviewCount,
    problematicCount,
    atRiskCount,
    overdueCount,
    summary: `${workloadLevelLabel(level)} workload · ${details}`,
    capacityLoadPercent,
    estimatedMonthlyHours: capacityBreakdown.estimatedMonthlyHours,
    monthlyCapacityHours: MONTHLY_CAPACITY_HOURS,
    requiredHeadcount: requiredHeadcount(capacityLoadPercent),
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

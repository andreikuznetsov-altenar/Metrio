import type { AuditIssue, ReportParams } from '../jira/types';
import type { PersonAvailability } from '../people/types';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';

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

export function isIssueActive(issue: AuditIssue, params: ReportParams): boolean {
  return !classifyTaskHealth({ issue, params }).isCompleted;
}

export function countActiveIssues(issues: AuditIssue[], params: ReportParams): number {
  return issues.filter((issue) => isIssueActive(issue, params)).length;
}

export interface WorkloadResult {
  level: WorkloadLevel;
  score: number;
  activeCount: number;
  inProgressCount: number;
  inReviewCount: number;
  problematicCount: number;
  atRiskCount: number;
  overdueCount: number;
  summary: string;
}

function isInProgress(status: string): boolean {
  return status.toLowerCase().includes('in progress');
}

function isInReview(status: string): boolean {
  const n = status.toLowerCase();
  return n === 'review' || n.includes('in review');
}

function isOnVacation(availability?: PersonAvailability): boolean {
  if (!availability) return false;
  return (
    availability.state === 'on_vacation' ||
    availability.state === 'returns_today' ||
    availability.isHoliday
  );
}

export function calculateWorkload(
  issues: AuditIssue[],
  params: ReportParams,
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
  availability?: PersonAvailability,
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
    };
  }
  let activeCount = 0;
  let inProgressCount = 0;
  let inReviewCount = 0;
  let problematicCount = 0;
  let atRiskCount = 0;
  let overdueCount = 0;

  issues.forEach((issue) => {
    const health = classifyTaskHealth({ issue, params });
    if (health.isCompleted) return;

    const status = issue.currentStatus || '';
    activeCount++;
    if (isInProgress(status)) inProgressCount++;
    if (isInReview(status)) inReviewCount++;
    if (health.status === 'problematic') problematicCount++;
    if (health.status === 'at_risk') atRiskCount++;
    if (health.reasons.some((r) => r.includes('exceeded'))) overdueCount++;
  });

  const score =
    activeCount +
    inProgressCount * 0.5 +
    inReviewCount * 0.25 +
    problematicCount * thresholds.problematicWeight +
    atRiskCount * thresholds.atRiskWeight +
    overdueCount * thresholds.overdueWeight;

  let level: WorkloadLevel = 'normal';
  if (score >= thresholds.overloadedScore || problematicCount >= 3) {
    level = 'overloaded';
  } else if (score >= thresholds.highScore || inProgressCount >= thresholds.highInProgress) {
    level = 'high';
  } else if (activeCount <= 2) {
    level = 'low';
  }

  const levelLabel =
    level === 'low'
      ? 'Low'
      : level === 'normal'
        ? 'Normal'
        : level === 'high'
          ? 'High'
          : 'Overloaded';

  return {
    level,
    score: Math.round(score * 10) / 10,
    activeCount,
    inProgressCount,
    inReviewCount,
    problematicCount,
    atRiskCount,
    overdueCount,
    summary: `${levelLabel} workload · ${activeCount} active · ${inProgressCount} in progress · ${problematicCount} problematic`,
  };
}

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
import { appNow } from '../../platform/appClock';
import { computeCurrentEffort } from './effort/currentEffortModel';
import { buildEffortHistory } from './effort/history';
import type { VolumeAdapter } from './effort/estimator';
import type {
  EffortBreakdownItem,
  EffortHistory,
  LeavePeriod,
  PipelineSignals,
} from './effort/types';
import type { WorkflowProfileMapping } from '../workflows/types';
import { resolveWorkflowProfile } from '../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../workflows/resolveWorkflowStage';
import { isWorkflowCapacityEligible } from '../workflows/eligibility';
import { isActiveWorkloadStatus } from '../workflows/workloadStatusClassification';

export type WorkloadLevel = 'low' | 'normal' | 'high' | 'overloaded';

export interface WorkloadThresholds {
  /** @deprecated Compatibility-only settings; V2 levels use fixed effort-percent bands. */
  highScore: number;
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
  /** Current Workload V2 percent (kept as `score` for view-model compatibility). */
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
  /**
   * Current Workload Model V2 (see ./effort): expected assignee effort in the next 10 working
   * days relative to the hours actually available. `score` mirrors `currentLoadPercent`.
   */
  currentLoadPercent?: number;
  expectedEffortHours?: number;
  handsOnRemainingHours?: number;
  reserveReworkHours?: number;
  expectedQueuedHours?: number;
  availableHoursInHorizon?: number;
  horizonWorkingDays?: number;
  leaveWorkingDays?: number;
  /** Per-issue effort diagnostics; contributions sum exactly to `expectedEffortHours`. */
  effortBreakdown?: EffortBreakdownItem[];
  /** Assigned / queued / review / QA / hold / waiting counts - pipeline pressure, not load. */
  pipeline?: PipelineSignals;
  /** Simultaneous hands-on issues - a context-switching signal that never overrides the percent. */
  concurrency?: number;
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
  /** Historical issues this person touched; current queue still comes from `issues`. */
  capacityIssues?: AuditIssue[];
  /** Canonical person whose assignee-history intervals should count for capacity. */
  capacitySubjectCanonical?: string;
  /** Team-wide history for effort estimation (build once with buildEffortHistory). */
  effortHistory?: EffortHistory;
  /** Known leave periods overlapping the planning horizon. */
  leave?: LeavePeriod[];
  /** Board-specific size adapters (games, skins, ...). */
  volumeAdapters?: VolumeAdapter[];
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
  _thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS,
  availability?: PersonAvailability,
  options: CalculateWorkloadOptions = {},
): WorkloadResult {
  const now = options.now ?? appNow();
  const uniqueIssues = [
    ...new Map(issues.map((issue) => [issue.issueKey, issue])).values(),
  ];

  // Historical capacity stays available for analytics but never drives today's badge.
  const capacityIssues = [
    ...new Map(
      (options.capacityIssues ?? uniqueIssues).map((issue) => [issue.issueKey, issue]),
    ).values(),
  ];
  const capacityBreakdown = calculateCapacityBreakdown({
    issues: capacityIssues,
    params,
    mappings: options.mappings,
    now,
    subjectCanonical: options.capacitySubjectCanonical,
    leave: options.leave,
  });
  const capacityDataState = capacityBreakdown.capacityDataState;
  const capacityLoadPercent = capacityBreakdown.capacityLoadPercent;

  const effort = computeCurrentEffort({
    issues: uniqueIssues,
    history:
      options.effortHistory ??
      buildEffortHistory(capacityIssues, { mappings: options.mappings, now }),
    params,
    now,
    mappings: options.mappings,
    availability,
    leave: options.leave,
    volumeAdapters: options.volumeAdapters,
  });

  // Away for the whole horizon: there is no capacity to load. Keep the queue/risk diagnostics
  // visible, but present the person as away instead of manufacturing an infinite load percent.
  const unavailable = effort.availableHoursInHorizon <= 0;
  const awayForHorizon = unavailable && isOnVacation(availability);

  // Health statistics (delivery-risk view) are reported, never converted into workload.
  let problematicCount = 0;
  let atRiskCount = 0;
  let overdueCount = 0;
  let inProgressCount = 0;
  uniqueIssues.forEach((issue) => {
    const health = classifyTaskHealth({ issue, params, now });
    if (health.isCompleted) return;
    const profile = resolveWorkflowProfile(issue, { mappings: options.mappings });
    const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
    if (stage.canonicalStage === 'active') inProgressCount++;
    if (health.status === 'problematic') problematicCount++;
    if (health.status === 'at_risk') atRiskCount++;
    if (health.status === 'problematic' && health.reasons.some((r) => /exceeds target/i.test(r))) overdueCount++;
  });

  const operational = countOperationalWorkload(uniqueIssues, params, options.mappings);
  const activeCount = countActiveIssues(uniqueIssues, params, options.mappings);

  // Level: expected effort relative to available hours. No hard task-count / problem-count rules.
  const level = awayForHorizon ? 'low' : capacityLevelFromPercent(effort.currentLoadPercent);

  const details = [
    `${operational.currentAssignedIssueCount} assigned`,
    `${effort.pipeline.handsOn} in progress`,
    `~${effort.expectedEffortHours}h of ${effort.availableHoursInHorizon}h (${effort.currentLoadPercent}%)`,
  ].join(' · ');

  return {
    level,
    score: effort.currentLoadPercent,
    activeCount,
    inProgressCount,
    inReviewCount: operational.reviewCount,
    problematicCount,
    atRiskCount,
    overdueCount,
    summary: awayForHorizon
      ? (availability?.label || 'Away')
      : `${workloadLevelLabel(level)} workload · ${details}`,
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
    currentLoadPercent: effort.currentLoadPercent,
    expectedEffortHours: effort.expectedEffortHours,
    handsOnRemainingHours: effort.handsOnRemainingHours,
    reserveReworkHours: effort.reserveReworkHours,
    expectedQueuedHours: effort.expectedQueuedHours,
    availableHoursInHorizon: effort.availableHoursInHorizon,
    horizonWorkingDays: effort.horizonWorkingDays,
    leaveWorkingDays: effort.leaveWorkingDays,
    effortBreakdown: effort.breakdown,
    pipeline: effort.pipeline,
    concurrency: effort.concurrency,
  };
}

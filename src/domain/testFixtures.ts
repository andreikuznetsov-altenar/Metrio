import type { KpiData } from './jira/types';
import type { WorkloadResult } from './workload/workloadEngine';
import { resolveCapacityDataState } from './workflows/capacityWorkload';

export function testWorkload(overrides: Partial<WorkloadResult> & Pick<WorkloadResult, 'level'>): WorkloadResult {
  const completedCyclesInPeriod =
    overrides.capacityBreakdown?.completedCyclesInPeriod ??
    (overrides.capacityDataState === 'insufficient_history' ? 0 : 3);
  const capacityDataState =
    overrides.capacityDataState ?? resolveCapacityDataState(completedCyclesInPeriod);
  const capacityLoadPercent = overrides.capacityLoadPercent ?? overrides.score ?? 45;
  const estimatedMonthlyHours = overrides.estimatedMonthlyHours ?? 72;
  const capacityBreakdown =
    overrides.capacityBreakdown ??
    ({
      completedCycleHours: 10,
      activeSegmentHours: 0,
      avgHoursPerCycle: 3,
      completedCyclesInPeriod,
      daysInPeriod: 30,
      monthlyQuantity: 3,
      estimatedMonthlyHours,
      capacityLoadPercent,
      capacityDataState,
    } satisfies NonNullable<WorkloadResult['capacityBreakdown']>);

  return {
    score: overrides.score ?? capacityLoadPercent,
    activeCount: overrides.activeCount ?? 2,
    inProgressCount: overrides.inProgressCount ?? 1,
    inReviewCount: overrides.inReviewCount ?? 0,
    problematicCount: overrides.problematicCount ?? 0,
    atRiskCount: overrides.atRiskCount ?? 0,
    overdueCount: overrides.overdueCount ?? 0,
    summary: overrides.summary ?? '',
    capacityLoadPercent,
    estimatedMonthlyHours,
    monthlyCapacityHours: overrides.monthlyCapacityHours ?? 164,
    requiredHeadcount: overrides.requiredHeadcount ?? 1,
    currentAssignedIssueCount: overrides.currentAssignedIssueCount ?? overrides.activeCount ?? 2,
    activeWorkCount: overrides.activeWorkCount ?? overrides.activeCount ?? 2,
    reviewCount: overrides.reviewCount ?? 0,
    qaCount: overrides.qaCount ?? 0,
    waitingCount: overrides.waitingCount ?? 0,
    holdCount: overrides.holdCount ?? 0,
    capacityDataState,
    capacityBreakdown,
    ...overrides,
  };
}

export function testKpi(overrides: Partial<KpiData> = {}): KpiData {
  return {
    startedCount: 0,
    reviewSubmittedCount: 0,
    completedCount: 0,
    firstPassAcceptedCount: 0,
    holdCount: 0,
    backflowCount: 0,
    avgProgressToReviewMs: null,
    avgReviewToDoneMs: null,
    avgProgressToHoldMs: null,
    avgTodoToApprovedMs: null,
    targetReviewDays: 3,
    efficiencyIndex: 0,
    ...overrides,
  };
}

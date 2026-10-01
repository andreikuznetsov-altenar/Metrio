import type { KpiData } from './jira/types';
import type { WorkloadResult } from './workload/workloadEngine';

export function testWorkload(overrides: Partial<WorkloadResult> & Pick<WorkloadResult, 'level'>): WorkloadResult {
  return {
    score: overrides.score ?? overrides.activeCount ?? 2,
    activeCount: overrides.activeCount ?? 2,
    inProgressCount: overrides.inProgressCount ?? 1,
    inReviewCount: overrides.inReviewCount ?? 0,
    problematicCount: overrides.problematicCount ?? 0,
    atRiskCount: overrides.atRiskCount ?? 0,
    overdueCount: overrides.overdueCount ?? 0,
    summary: overrides.summary ?? '',
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

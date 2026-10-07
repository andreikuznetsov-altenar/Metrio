import { isDateWithinRange } from '../jira/dates';
import { calculateEfficiencyIndex } from '../jira/kpi';
import type { AuditIssue, KpiData, ReportParams } from '../jira/types';
import { isWorkflowKpiEligible } from './eligibility';
import {
  extractProfileContributorCycles,
  extractProfileHoldTransitions,
} from './profileCycles';
import { resolveWorkflowProfile } from './resolveWorkflowProfile';
import type { WorkflowProfileMapping } from './types';
import { calculateWskinsEfficiencyIndex } from './wskinsEfficiency';
import {
  buildWskinsKpiFromIssues,
  calculateWskinsIssueKpiContribution,
} from './wskinsKpi';

function averageMs(items: number[]): number | null {
  if (!items.length) return null;
  return Math.round(items.reduce((a, b) => a + b, 0) / items.length);
}

export interface BuildWorkflowKpiOptions {
  mappings?: WorkflowProfileMapping[];
}

function emptyKpi(targetReviewDays: number): KpiData {
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
    targetReviewDays,
    efficiencyIndex: 0,
  };
}

export function buildWorkflowKpi(
  issues: AuditIssue[],
  params: ReportParams,
  options: BuildWorkflowKpiOptions = {},
): KpiData {
  const targetReviewDays = Number(params?.targetReviewDays ?? 3);
  const eligible = (issues || []).filter(isWorkflowKpiEligible);
  if (!eligible.length) return emptyKpi(targetReviewDays);

  const progressToReviewDurations: number[] = [];
  const reviewToDoneDurations: number[] = [];
  const progressToHoldDurations: number[] = [];
  const todoToApprovedDurations: number[] = [];

  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let firstPassAcceptedCount = 0;
  let holdCount = 0;
  let backflowCount = 0;

  const profileStats: Record<
    string,
    {
      efficiencyModel: 'ux' | 'wskins' | 'none';
      startedCount: number;
      reviewSubmittedCount: number;
      completedCount: number;
      firstPassAcceptedCount: number;
      backflowCount: number;
      avgProgressToReviewMs: number | null;
    }
  > = {};

  const wskinsIssues: AuditIssue[] = [];

  eligible.forEach((issue) => {
    const profile = resolveWorkflowProfile(issue, options);
    if (profile.efficiencyModel === 'wskins') {
      wskinsIssues.push(issue);
    }
    if (!profileStats[profile.id]) {
      profileStats[profile.id] = {
        efficiencyModel: profile.efficiencyModel,
        startedCount: 0,
        reviewSubmittedCount: 0,
        completedCount: 0,
        firstPassAcceptedCount: 0,
        backflowCount: 0,
        avgProgressToReviewMs: null,
      };
    }

    if (profile.efficiencyModel === 'wskins') {
      const contrib = calculateWskinsIssueKpiContribution(issue, params);
      startedCount += contrib.startedCount;
      reviewSubmittedCount += contrib.reviewSubmittedCount;
      completedCount += contrib.completedCount;
      backflowCount += contrib.backflowCount;
      profileStats[profile.id].startedCount += contrib.startedCount;
      profileStats[profile.id].reviewSubmittedCount += contrib.reviewSubmittedCount;
      profileStats[profile.id].completedCount += contrib.completedCount;
      profileStats[profile.id].backflowCount += contrib.backflowCount;
      contrib.workDurationsMs.forEach((ms) => {
        if (ms >= 0) {
          progressToReviewDurations.push(ms);
          profileStats[profile.id].avgProgressToReviewMs = ms;
        }
      });
    }

    const holdTransitions = extractProfileHoldTransitions(issue, profile);
    holdTransitions.forEach((transition) => {
      if (!isDateWithinRange(transition.changedAt, params)) return;
      holdCount++;
      if (
        transition.progressToHoldMs !== null &&
        transition.progressToHoldMs >= 0
      ) {
        progressToHoldDurations.push(transition.progressToHoldMs);
      }
    });

    const cycles = extractProfileContributorCycles(issue, profile, params).filter(
      (cycle) => cycle.completedAt && isDateWithinRange(cycle.completedAt, params),
    );
    if (profile.efficiencyModel === 'wskins') {
      return;
    }
    cycles.forEach((cycle) => {
      startedCount++;
      reviewSubmittedCount++;
      completedCount++;
      profileStats[profile.id].startedCount++;
      profileStats[profile.id].reviewSubmittedCount++;
      profileStats[profile.id].completedCount++;

      if (cycle.progressToReviewMs !== null && cycle.progressToReviewMs >= 0) {
        progressToReviewDurations.push(cycle.progressToReviewMs);
        profileStats[profile.id].avgProgressToReviewMs = cycle.progressToReviewMs;
      }
      if (cycle.reviewToDoneMs !== null && cycle.reviewToDoneMs >= 0) {
        reviewToDoneDurations.push(cycle.reviewToDoneMs);
      }
      if (cycle.fullCycleMs !== null && cycle.fullCycleMs >= 0) {
        todoToApprovedDurations.push(cycle.fullCycleMs);
      }
      if (cycle.isFirstPass) {
        firstPassAcceptedCount++;
        profileStats[profile.id].firstPassAcceptedCount++;
      }
      if (cycle.hasBackflow) {
        backflowCount++;
        profileStats[profile.id].backflowCount++;
      }
    });
  });

  const avgProgressToReviewMs = averageMs(progressToReviewDurations);
  const avgReviewToDoneMs = averageMs(reviewToDoneDurations);
  const avgProgressToHoldMs = averageMs(progressToHoldDurations);
  const avgTodoToApprovedMs = averageMs(todoToApprovedDurations);

  const profileEfficiency: Record<string, { completedCount: number; efficiencyIndex: number }> =
    {};
  let weightedEfficiency = 0;
  let weightedCompleted = 0;

  Object.entries(profileStats).forEach(([profileId, stats]) => {
    if (stats.completedCount <= 0) return;
    let efficiency = 0;
    if (stats.efficiencyModel === 'wskins') {
      efficiency = calculateWskinsEfficiencyIndex({
        startedCount: stats.startedCount,
        reviewSubmittedCount: stats.reviewSubmittedCount,
        completedCount: stats.completedCount,
        backflowCount: stats.backflowCount,
        avgProgressToReviewMs: averageMs(
          eligible
            .filter((issue) => resolveWorkflowProfile(issue, options).id === profileId)
            .flatMap((issue) => calculateWskinsIssueKpiContribution(issue, params).workDurationsMs),
        ),
        targetReviewDays,
      }).total;
    } else if (stats.efficiencyModel === 'ux') {
      efficiency = calculateEfficiencyIndex({
        startedCount: stats.startedCount,
        completedCount: stats.completedCount,
        firstPassAcceptedCount: stats.firstPassAcceptedCount,
        backflowCount: stats.backflowCount,
        avgProgressToReviewMs: stats.avgProgressToReviewMs,
        targetReviewDays,
      });
    }
    profileEfficiency[profileId] = {
      completedCount: stats.completedCount,
      efficiencyIndex: efficiency,
    };
    weightedEfficiency += efficiency * stats.completedCount;
    weightedCompleted += stats.completedCount;
  });

  const uniqueModels = new Set(
    Object.values(profileStats).map((s) => s.efficiencyModel).filter((m) => m !== 'none'),
  );

  let efficiencyIndex = 0;
  if (uniqueModels.size > 1) {
    efficiencyIndex =
      weightedCompleted > 0 ? Math.round(weightedEfficiency / weightedCompleted) : 0;
  } else if (uniqueModels.has('wskins') && wskinsIssues.length === eligible.length) {
    efficiencyIndex = buildWskinsKpiFromIssues(wskinsIssues, params).efficiencyIndex;
  } else if (uniqueModels.has('wskins')) {
    efficiencyIndex = calculateWskinsEfficiencyIndex({
      startedCount,
      reviewSubmittedCount,
      completedCount,
      backflowCount,
      avgProgressToReviewMs,
      targetReviewDays,
    }).total;
  } else {
    efficiencyIndex = calculateEfficiencyIndex({
      startedCount,
      completedCount,
      firstPassAcceptedCount,
      backflowCount,
      avgProgressToReviewMs,
      targetReviewDays,
    });
  }

  return {
    startedCount,
    reviewSubmittedCount,
    completedCount,
    firstPassAcceptedCount,
    holdCount,
    backflowCount,
    avgProgressToReviewMs,
    avgReviewToDoneMs,
    avgProgressToHoldMs,
    avgTodoToApprovedMs,
    targetReviewDays,
    efficiencyIndex,
  };
}

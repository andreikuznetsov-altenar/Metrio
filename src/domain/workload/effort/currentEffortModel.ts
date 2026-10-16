import { appNow } from '../../../platform/appClock';
import type { AuditIssue, ReportParams } from '../../jira/types';
import type { PersonAvailability } from '../../people/types';
import { resolveAssigneeEffortMode } from '../../workflows/assigneeEffort';
import { isWorkflowCapacityEligible } from '../../workflows/eligibility';
import { resolveWorkflowProfile } from '../../workflows/resolveWorkflowProfile';
import { resolveWorkflowStage } from '../../workflows/resolveWorkflowStage';
import type { WorkflowProfileMapping } from '../../workflows/types';
import {
  estimateRemainingHours,
  estimateReserve,
  estimateStartProbability,
  estimateTotalHours,
  volumeFor,
  type EstimateContext,
  type VolumeAdapter,
} from './estimator';
import { buildEffortHistory, elapsedHandsOnHours, issueTypeKey } from './history';
import { availableHoursInHorizon, horizonWorkingDays } from './horizon';
import type {
  CurrentEffortResult,
  EffortBreakdownItem,
  EffortHistory,
  LeavePeriod,
  PipelineSignals,
} from './types';

export interface CurrentEffortInput {
  /** The person's CURRENT assigned issues (their queue). */
  issues: AuditIssue[];
  /** Team-wide history for the estimators; derived from `issues` alone when omitted. */
  history?: EffortHistory;
  params?: ReportParams;
  now?: Date;
  mappings?: WorkflowProfileMapping[];
  availability?: PersonAvailability;
  leave?: LeavePeriod[];
  volumeAdapters?: VolumeAdapter[];
}

const cents = (value: number) => Math.round(value * 100) / 100;

/**
 * Current Workload Model V2: expected effort the assignee must perform in the next
 * 10 working days, relative to the hours they are actually available. Historical capacity
 * (cycle analytics) is not an input; blocked/hold/waiting work contributes no live effort.
 */
export function computeCurrentEffort(input: CurrentEffortInput): CurrentEffortResult {
  const now = input.now ?? appNow();
  const nowMs = now.getTime();
  const horizon = horizonWorkingDays(now);
  const horizonEnd = horizon[horizon.length - 1]!;
  const history =
    input.history ?? buildEffortHistory(input.issues, { mappings: input.mappings, now });
  const capacity = availableHoursInHorizon(now, input.leave, input.availability);

  const breakdown: EffortBreakdownItem[] = [];
  const pipeline: PipelineSignals = {
    assigned: 0,
    handsOn: 0,
    queued: 0,
    review: 0,
    qa: 0,
    hold: 0,
    waiting: 0,
    externalWait: 0,
  };
  const seen = new Set<string>();

  for (const issue of input.issues) {
    if (seen.has(issue.issueKey)) continue;
    seen.add(issue.issueKey);
    if (!isWorkflowCapacityEligible(issue)) continue;
    const profile = resolveWorkflowProfile(issue, { mappings: input.mappings });
    const stage = resolveWorkflowStage(profile, issue.currentStatus || '');
    if (stage.isCompletion || stage.isTerminal || stage.canonicalStage === 'cancelled') continue;

    const mode = resolveAssigneeEffortMode(profile, issue.currentStatus);
    pipeline.assigned += 1;
    if (mode === 'hands_on') pipeline.handsOn += 1;
    if (mode === 'queued') pipeline.queued += 1;
    if (stage.canonicalStage === 'review') pipeline.review += 1;
    if (stage.canonicalStage === 'qa') pipeline.qa += 1;
    if (stage.canonicalStage === 'hold') pipeline.hold += 1;
    if (stage.canonicalStage === 'waiting') pipeline.waiting += 1;
    if (mode === 'external_wait') pipeline.externalWait += 1;

    const ctx: EstimateContext = {
      ownerKey: issue.currentAssigneeCanonical ?? null,
      teamKey: (issue.projectKey || 'none').trim().toLowerCase(),
      profileId: profile.id,
      issueType: issueTypeKey(issue),
    };
    const volume = volumeFor(issue, input.volumeAdapters);
    const item: EffortBreakdownItem = {
      issueKey: issue.issueKey,
      profileId: profile.id,
      rawStatus: issue.currentStatus || '',
      canonicalStage: stage.canonicalStage,
      effortMode: mode,
      estimatedTotalHours: null,
      elapsedHandsOnHours: null,
      estimatedRemainingHours: null,
      startProbability: null,
      returnProbability: null,
      expectedReworkHours: null,
      reserveHours: 0,
      contributionHours: 0,
      totalEstimateSource: null,
      remainingEstimateSource: null,
      startProbabilitySource: null,
      startProbabilityScheduled: null,
      reserveEstimateSource: null,
      reworkEstimateSource: null,
      estimateSource: 'not_applicable',
      volumeMultiplier: null,
      volumeSource: null,
    };
    // A structured Jira estimate already carries the size; adapters scale history-based figures only.
    const scaleFor = (source: string) =>
      volume && !source.startsWith('jira_') ? volume.multiplier : 1;
    const markVolume = (source: string) => {
      if (volume && !source.startsWith('jira_')) {
        item.volumeMultiplier = volume.multiplier;
        item.volumeSource = volume.source;
      }
    };

    if (mode === 'hands_on') {
      const elapsed = elapsedHandsOnHours(issue, input.mappings, nowMs);
      const total = estimateTotalHours(history, ctx, issue);
      const remaining = estimateRemainingHours(history, ctx, issue, elapsed);
      markVolume(remaining.source);
      item.elapsedHandsOnHours = cents(elapsed);
      item.estimatedRemainingHours = cents(remaining.hours * scaleFor(remaining.source));
      const baselineTotal = total.hours * scaleFor(total.source);
      const reforecastTotal = elapsed + item.estimatedRemainingHours;
      item.estimatedTotalHours = cents(Math.max(baselineTotal, reforecastTotal));
      item.totalEstimateSource = reforecastTotal > baselineTotal ? remaining.source : total.source;
      item.remainingEstimateSource = remaining.source;
      item.estimateSource = remaining.source;
      item.contributionHours = item.estimatedRemainingHours;
    } else if (mode === 'queued') {
      const total = estimateTotalHours(history, ctx, issue);
      const start = estimateStartProbability(history, ctx, issue, now, horizonEnd);
      markVolume(total.source);
      item.estimatedTotalHours = cents(total.hours * scaleFor(total.source));
      item.startProbability = Math.round(start.probability * 1000) / 1000;
      item.totalEstimateSource = total.source;
      item.startProbabilitySource = start.source;
      item.startProbabilityScheduled = start.scheduled;
      item.estimateSource = total.source;
      item.contributionHours = cents(item.estimatedTotalHours * start.probability);
    } else if (mode === 'reserve' || (mode === 'external_wait' && stage.canonicalStage === 'qa')) {
      const reserve = estimateReserve(history, ctx, stage.canonicalStage === 'qa' ? 'qa' : 'review');
      item.returnProbability = Math.round(reserve.returnProbability * 1000) / 1000;
      item.expectedReworkHours = cents(reserve.reworkHours);
      item.reserveHours = cents(reserve.reserveHours);
      item.reserveEstimateSource = reserve.source;
      item.reworkEstimateSource = reserve.reworkSource;
      item.estimateSource = reserve.source;
      item.contributionHours = item.reserveHours;
    }
    breakdown.push(item);
  }

  // Integer cents so the parts add up to the total exactly.
  const sum = (pick: (i: EffortBreakdownItem) => number) =>
    breakdown.reduce((acc, i) => acc + Math.round(pick(i) * 100), 0) / 100;
  const handsOnRemainingHours = sum((i) => (i.effortMode === 'hands_on' ? i.contributionHours : 0));
  const expectedQueuedHours = sum((i) => (i.effortMode === 'queued' ? i.contributionHours : 0));
  const reserveReworkHours = sum((i) => i.reserveHours);
  const expectedEffortHours = sum((i) => i.contributionHours);
  const currentLoadPercent =
    capacity.hours > 0
      ? Math.round((expectedEffortHours / capacity.hours) * 1000) / 10
      : 0;

  return {
    expectedEffortHours,
    handsOnRemainingHours,
    reserveReworkHours,
    expectedQueuedHours,
    availableHoursInHorizon: capacity.hours,
    horizonWorkingDays: capacity.workingDays,
    leaveWorkingDays: capacity.leaveWorkingDays,
    currentLoadPercent,
    breakdown,
    pipeline,
    concurrency: pipeline.handsOn,
  };
}

import type { AuditIssue } from '../../jira/types';
import { dateKeyInTimeZone } from '../../calendar/workingCalendar';
import { HORIZON_WORKING_DAYS } from './horizon';
import type {
  EffortEstimateSource,
  EffortHistory,
  ExecutionSample,
  ReserveVisitSample,
  StartWaitSample,
} from './types';

/**
 * Documented defaults. Every one is used only when history is too thin and is reported as
 * `global_fallback` in the diagnostics.
 */
export const EFFORT_DEFAULTS = {
  /** Samples needed before a narrow bucket is trusted. */
  minSamples: 5,
  /** Samples needed for the "remaining given elapsed" conditional estimate. */
  minConditionalSamples: 3,
  /** Conservative hands-on effort of one issue without any usable history: 1.5 working days. */
  fallbackTotalHours: 12,
  minRemainingHours: 2,
  maxRemainingHours: 40,
  /** Pseudo-observations of the parent rate blended into a narrower bucket's return probability. */
  shrinkageWeight: 5,
  /** Review returns work for rework in a minority of cases: much smaller than a full active task. */
  fallbackReviewReturnProbability: 0.2,
  fallbackQaReturnProbability: 0.15,
  fallbackReworkHours: 4,
  /** Queued work without scheduling information or history: coin flip to start within the horizon. */
  fallbackStartProbability: 0.5,
  /** Issue due inside the horizon is very likely to be started (and finished) inside it. */
  dueInHorizonStartProbability: 0.9,
  overdueStartProbability: 0.95,
} as const;

export interface EstimateContext {
  ownerKey: string | null;
  teamKey: string;
  profileId: string;
  issueType: string;
}

type Sample = EstimateContext;

export interface Picked<T> {
  source: Exclude<EffortEstimateSource, 'jira_remaining_estimate' | 'jira_original_estimate' | 'not_applicable'>;
  samples: T[];
}

/**
 * Narrowest bucket with enough samples:
 * person+profile+type, team/board+profile+type, organization+profile+type, profile.
 */
export function pickBucket<T extends Sample>(
  all: T[],
  ctx: EstimateContext,
  minSamples: number = EFFORT_DEFAULTS.minSamples,
): Picked<T> {
  const sameProfile = all.filter((s) => s.profileId === ctx.profileId);
  const sameType = sameProfile.filter((s) => s.issueType === ctx.issueType);
  const person = ctx.ownerKey ? sameType.filter((s) => s.ownerKey === ctx.ownerKey) : [];
  if (person.length >= minSamples) return { source: 'person_profile_type', samples: person };
  const team = sameType.filter((s) => s.teamKey === ctx.teamKey);
  if (team.length >= minSamples) return { source: 'team_profile_type', samples: team };
  if (sameType.length >= minSamples) return { source: 'org_profile_type', samples: sameType };
  if (sameProfile.length >= minSamples) return { source: 'profile', samples: sameProfile };
  return { source: 'global_fallback', samples: [] };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Board-specific size adapter (e.g. number of games, skins). 1.0 = a typical issue. */
export interface VolumeAdapter {
  id: string;
  multiplier(issue: AuditIssue): number | null;
}

export function volumeFor(
  issue: AuditIssue,
  adapters: VolumeAdapter[] = [],
): { multiplier: number; source: string } | null {
  for (const adapter of adapters) {
    const value = adapter.multiplier(issue);
    if (value != null && Number.isFinite(value) && value > 0) {
      return { multiplier: value, source: adapter.id };
    }
  }
  return null;
}

export interface HoursEstimate {
  hours: number;
  source: EffortEstimateSource;
}

/** Total hands-on effort of one issue. Structured Jira estimate first, then history. */
export function estimateTotalHours(
  history: EffortHistory,
  ctx: EstimateContext,
  issue: AuditIssue,
): HoursEstimate {
  if (issue.originalEstimateHours && issue.originalEstimateHours > 0) {
    return { hours: issue.originalEstimateHours, source: 'jira_original_estimate' };
  }
  const bucket = pickBucket<ExecutionSample>(history.execution, ctx);
  if (bucket.samples.length === 0) {
    return { hours: EFFORT_DEFAULTS.fallbackTotalHours, source: 'global_fallback' };
  }
  return { hours: median(bucket.samples.map((s) => s.handsOnHours)), source: bucket.source };
}

/**
 * Remaining hands-on effort of an issue already in progress. Never zero: an issue that has
 * outlived every comparable sample still gets a floor, scaled by how long it has been running.
 */
export function estimateRemainingHours(
  history: EffortHistory,
  ctx: EstimateContext,
  issue: AuditIssue,
  elapsedHours: number,
): HoursEstimate {
  const { minRemainingHours, maxRemainingHours, minConditionalSamples } = EFFORT_DEFAULTS;
  if (issue.remainingEstimateHours && issue.remainingEstimateHours > 0) {
    return { hours: issue.remainingEstimateHours, source: 'jira_remaining_estimate' };
  }
  if (issue.originalEstimateHours && issue.originalEstimateHours > 0) {
    return {
      hours: Math.max(minRemainingHours, issue.originalEstimateHours - elapsedHours),
      source: 'jira_original_estimate',
    };
  }
  const bucket = pickBucket<ExecutionSample>(history.execution, ctx);
  if (bucket.samples.length === 0) {
    return {
      hours: Math.max(minRemainingHours, EFFORT_DEFAULTS.fallbackTotalHours - elapsedHours),
      source: 'global_fallback',
    };
  }
  const totals = bucket.samples.map((s) => s.handsOnHours);
  const comparable = totals.filter((t) => t >= elapsedHours);
  if (comparable.length >= minConditionalSamples) {
    return {
      hours: Math.max(minRemainingHours, median(comparable) - elapsedHours),
      source: bucket.source,
    };
  }
  // Longer than (almost) every comparable execution: still expect a tail, growing with its age.
  const tail = 0.25 * Math.max(elapsedHours, median(totals));
  return {
    hours: Math.min(maxRemainingHours, Math.max(minRemainingHours, tail)),
    source: bucket.source,
  };
}

export interface ReserveEstimate {
  returnProbability: number;
  reworkHours: number;
  reserveHours: number;
  source: EffortEstimateSource;
  reworkSource: EffortEstimateSource;
}

/** Review / QA rework reserve = P(back to hands_on) x expected rework hours, from real transitions. */
export function estimateReserve(
  history: EffortHistory,
  ctx: EstimateContext,
  kind: 'review' | 'qa',
): ReserveEstimate {
  const visits = history.reserveVisits.filter((v) => v.kind === kind);
  const bucket = pickBucket<ReserveVisitSample>(visits, ctx);
  const fallbackP =
    kind === 'review'
      ? EFFORT_DEFAULTS.fallbackReviewReturnProbability
      : EFFORT_DEFAULTS.fallbackQaReturnProbability;
  let probability = fallbackP;
  let source: EffortEstimateSource = 'global_fallback';
  let reworkPool: ReserveVisitSample[] = [];
  if (bucket.samples.length > 0) {
    // Shrink a narrow bucket's rate toward the whole profile's rate so a short clean streak
    // (e.g. 0 returns in 6 reviews) does not read as "this review can never come back".
    const profileVisits = visits.filter((v) => v.profileId === ctx.profileId);
    const parentRate = profileVisits.length >= EFFORT_DEFAULTS.minSamples
      ? profileVisits.filter((v) => v.returned).length / profileVisits.length
      : fallbackP;
    const returns = bucket.samples.filter((v) => v.returned).length;
    const k = EFFORT_DEFAULTS.shrinkageWeight;
    probability = (returns + k * parentRate) / (bucket.samples.length + k);
    source = bucket.source;
    reworkPool = bucket.samples;
  }
  let rework = visitsRework(reworkPool);
  let reworkSource: EffortEstimateSource = bucket.source;
  if (rework === null) {
    // Not enough measured reworks in the bucket: widen to the whole profile, then the default.
    rework = visitsRework(visits.filter((v) => v.profileId === ctx.profileId));
    reworkSource = rework === null ? 'global_fallback' : 'profile';
  }
  const reworkHours = rework ?? EFFORT_DEFAULTS.fallbackReworkHours;
  return {
    returnProbability: probability,
    reworkHours,
    reserveHours: probability * reworkHours,
    source,
    reworkSource,
  };
}

function visitsRework(visits: ReserveVisitSample[]): number | null {
  const hours = visits
    .filter((v) => v.returned && v.reworkHours != null)
    .map((v) => v.reworkHours as number);
  return hours.length >= EFFORT_DEFAULTS.minConditionalSamples ? median(hours) : null;
}

export interface StartEstimate {
  probability: number;
  source: EffortEstimateSource;
  scheduled: boolean;
}

/**
 * P(a queued issue enters hands_on inside the horizon). A due date inside (or before) the horizon
 * dominates; otherwise the historical share of issues that started within the horizon, counting
 * long-waiting still-queued issues as "did not start".
 */
export function estimateStartProbability(
  history: EffortHistory,
  ctx: EstimateContext,
  issue: AuditIssue,
  now: Date,
  horizonEnd: Date,
  horizonDays: number = HORIZON_WORKING_DAYS,
): StartEstimate {
  const dueKey = issue.dueDate?.slice(0, 10);
  const todayKey = localKey(now);
  const endKey = localKey(horizonEnd);
  let scheduledP: number | null = null;
  if (dueKey && /^\d{4}-\d{2}-\d{2}$/.test(dueKey)) {
    if (dueKey < todayKey) scheduledP = EFFORT_DEFAULTS.overdueStartProbability;
    else if (dueKey <= endKey) scheduledP = EFFORT_DEFAULTS.dueInHorizonStartProbability;
  }

  const waits = history.startWaits.filter(
    (w) => w.started || w.waitDays >= horizonDays,
  ) as StartWaitSample[];
  const bucket = pickBucket<StartWaitSample>(waits, ctx);
  let historical = EFFORT_DEFAULTS.fallbackStartProbability;
  let source: EffortEstimateSource = 'global_fallback';
  if (bucket.samples.length > 0) {
    historical =
      bucket.samples.filter((w) => w.started && w.waitDays <= horizonDays).length /
      bucket.samples.length;
    source = bucket.source;
  }
  if (scheduledP !== null) {
    return { probability: Math.max(scheduledP, historical), source: 'due_date', scheduled: true };
  }
  return { probability: historical, source, scheduled: false };
}

function localKey(date: Date): string {
  return dateKeyInTimeZone(date);
}

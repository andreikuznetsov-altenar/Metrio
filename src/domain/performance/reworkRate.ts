import type { MetricCardData } from '../performance';

/**
 * Rework Rate = reworked cycles / completed cycles (the complement of First Pass).
 *
 * Both thresholds are named, shared by the metric card and the "Rework elevated" organization
 * signal, and deliberately expressed as a RATE with a sample guard - an absolute count of
 * reworked cycles scales with team size and throughput and says nothing about quality.
 */
/** Completed cycles needed before a rate is rated. 1/1 or 2/3 is anecdote, not a signal. */
export const REWORK_RATE_MIN_COMPLETED_SAMPLE = 5;
/**
 * Share of completed cycles needing rework above which a team is flagged "Rework elevated".
 * 40% = First Pass below 60%: at the minimum sample that is 2 of 5 cycles, i.e. rework is the
 * norm for a large minority rather than an occasional event. No First Pass / Rework target exists
 * in the operational rules, so this is the single documented default.
 */
export const REWORK_RATE_ELEVATED_PERCENT = 40;

export interface ReworkCounts {
  completedCount: number;
  reworkedCycleCount: number;
}

function validCounts(counts: ReworkCounts | null | undefined): counts is ReworkCounts {
  return Boolean(counts && counts.completedCount > 0);
}

/**
 * Canonical fractions, straight from the cycle counts (never from a rounded percentage):
 *   reworkRate = reworkedCycleCount / completedCycleCount
 *   firstPass  = firstPassCycleCount / completedCycleCount, firstPassCycleCount = completed - reworked
 */
export function reworkRateFraction(counts: ReworkCounts | null | undefined): number | null {
  if (!validCounts(counts)) return null;
  return Math.min(counts.completedCount, Math.max(0, counts.reworkedCycleCount)) / counts.completedCount;
}

export function firstPassFraction(counts: ReworkCounts | null | undefined): number | null {
  const rework = reworkRateFraction(counts);
  return rework === null ? null : 1 - rework;
}

/**
 * Two-decimal DISPLAY percentages of First Pass and Rework Rate that always add up to exactly 100.
 * Both come from the exact counts; only the final cent is placed by largest remainder (ties go to
 * First Pass), so 1/32 shows 96.88% + 3.12% instead of 96.88% + 3.13%.
 */
export function coordinatedRatePercents(
  counts: ReworkCounts | null | undefined,
): { firstPass: number; rework: number } | null {
  if (!validCounts(counts)) return null;
  const completed = counts.completedCount;
  const reworked = Math.min(completed, Math.max(0, counts.reworkedCycleCount));
  const rawRework = (reworked / completed) * 10000; // hundredths of a percent
  const rawFirst = ((completed - reworked) / completed) * 10000;
  let rework = Math.floor(rawRework + 1e-9);
  let first = Math.floor(rawFirst + 1e-9);
  let deficit = 10000 - rework - first;
  const reworkRemainder = rawRework - rework;
  const firstRemainder = rawFirst - first;
  // The floors can fall short by at most two hundredths: hand them out by largest remainder.
  const order: ('first' | 'rework')[] =
    firstRemainder >= reworkRemainder ? ['first', 'rework'] : ['rework', 'first'];
  for (let i = 0; i < deficit; i += 1) {
    if (order[i % 2] === 'first') first += 1;
    else rework += 1;
  }
  return { firstPass: first / 100, rework: rework / 100 };
}

/** First Pass % for display (two decimals, reconciled with Rework Rate), or null with no completed cycles. */
export function firstPassPercentFromCounts(counts: ReworkCounts | null | undefined): number | null {
  return coordinatedRatePercents(counts)?.firstPass ?? null;
}

/** Rework Rate % for display (two decimals, reconciled with First Pass). */
export function reworkRatePercent(counts: ReworkCounts | null | undefined): number | null {
  return coordinatedRatePercents(counts)?.rework ?? null;
}

export function hasReworkSample(counts: ReworkCounts): boolean {
  return counts.completedCount >= REWORK_RATE_MIN_COMPLETED_SAMPLE;
}

/** Rate AND a sufficient denominator - never an absolute count. */
export function isReworkElevated(counts: ReworkCounts): boolean {
  const fraction = reworkRateFraction(counts);
  return hasReworkSample(counts) && fraction !== null && fraction * 100 >= REWORK_RATE_ELEVATED_PERCENT;
}

/** The interactive "Rework Rate" metric card shown next to First Pass. */
export function reworkRateMetric(counts: ReworkCounts | null | undefined): MetricCardData {
  const label = 'Rework Rate';
  if (!counts || counts.completedCount <= 0) {
    return { label, value: '—', status: 'No completed cycles', statusVariant: 'neutral' };
  }
  const rate = reworkRatePercent(counts)!;
  return {
    label,
    value: `${rate}%`,
    status: hasReworkSample(counts)
      ? `${counts.reworkedCycleCount} of ${counts.completedCount} cycles`
      : `${counts.reworkedCycleCount} of ${counts.completedCount} cycles · small sample`,
    statusVariant: 'neutral',
  };
}

/** Organization trend note: rate + sample guard (small sample / elevated / stable). */
export function reworkTrendNote(counts: ReworkCounts): 'Rework sample small' | 'Rework elevated' | 'Delivery stable' {
  if (!hasReworkSample(counts)) return 'Rework sample small';
  return isReworkElevated(counts) ? 'Rework elevated' : 'Delivery stable';
}

import { businessMsToDays } from '../jira/dates';
import {
  calendarPeriodDateKeys,
  previousCalendarPeriodDateKeys,
} from '../periods/calendarPeriod';
import type { PerformanceDateRange } from '../performance/performanceDateRange';
import {
  inclusiveRangeDayCount,
  previousComparableRange,
} from '../performance/performanceDateRange';

import { appNow } from "../../platform/appClock";
export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown';

/**
 * How a metric aggregates over a comparison period.
 *  - sum / average            single daily series: events add up (flow); sampled state is the mean of the sampled days
 *  - weighted_rate            Σ numerator / Σ denominator (First Pass, Rework Rate) — never a sum of daily percentages
 *  - weighted_average         Σ duration / Σ samples (sample-weighted mean, secondary)
 *  - sample_median            median of the pooled raw duration samples (Cycle / Execution Time, primary)
 * Ratio and sample aggregations cannot be computed from one derived series; they have dedicated
 * `compare…` functions that take their primitives.
 */
export type TrendAggregation =
  | 'sum'
  | 'average'
  | 'weighted_rate'
  | 'weighted_average'
  | 'sample_median';

export type TrendMetricId =
  | 'completed'
  | 'backflows'
  | 'firstPass'
  | 'reworkRate'
  | 'avgCycle'
  | 'cycleTime'
  | 'executionTime'
  | 'problematic'
  | 'active'
  | 'atRisk'
  | 'overloaded';

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrendMetricDescriptor {
  id: TrendMetricId;
  aggregation: TrendAggregation;
  /** Semantic direction — not always "better". */
  favorableDirection: 'up' | 'down' | 'neutral';
  label: string;
}

export const TREND_METRICS: Record<TrendMetricId, TrendMetricDescriptor> = {
  completed: {
    id: 'completed',
    aggregation: 'sum',
    favorableDirection: 'neutral',
    label: 'Completed',
  },
  backflows: {
    id: 'backflows',
    aggregation: 'sum',
    favorableDirection: 'down',
    label: 'Backflow Events',
  },
  firstPass: {
    id: 'firstPass',
    aggregation: 'weighted_rate',
    favorableDirection: 'up',
    label: 'First Pass',
  },
  reworkRate: {
    id: 'reworkRate',
    aggregation: 'weighted_rate',
    favorableDirection: 'down',
    label: 'Rework Rate',
  },
  avgCycle: {
    id: 'avgCycle',
    aggregation: 'weighted_average',
    favorableDirection: 'down',
    label: 'Cycle Time (mean)',
  },
  cycleTime: {
    id: 'cycleTime',
    aggregation: 'sample_median',
    favorableDirection: 'down',
    label: 'Cycle Time',
  },
  executionTime: {
    id: 'executionTime',
    aggregation: 'sample_median',
    favorableDirection: 'down',
    label: 'Execution Time',
  },
  problematic: {
    id: 'problematic',
    aggregation: 'average',
    favorableDirection: 'down',
    label: 'Problematic tasks',
  },
  active: {
    id: 'active',
    aggregation: 'average',
    favorableDirection: 'neutral',
    label: 'Active tasks',
  },
  atRisk: {
    id: 'atRisk',
    aggregation: 'average',
    favorableDirection: 'down',
    label: 'At-risk tasks',
  },
  overloaded: {
    id: 'overloaded',
    aggregation: 'average',
    favorableDirection: 'down',
    label: 'Overloaded people',
  },
};

export interface TrendComparison {
  current: number;
  previous: number;
  absoluteDelta: number;
  percentagePointDelta: number | null;
  direction: TrendDirection;
  label: string;
  sufficient: boolean;
  sufficiencyMessage: string | null;
  unknown: boolean;
  /** Samples/denominator behind each side for ratio and duration metrics. */
  currentSamples?: number;
  previousSamples?: number;
}

export interface TrendSufficiency {
  sufficient: boolean;
  daysRecorded: number;
  previousDaysRecorded: number;
  recommended: number;
}

export function currentPeriod(points: TrendPoint[], days: number, now = appNow()): TrendPoint[] {
  const keys = new Set(calendarPeriodDateKeys(days, now));
  return points.filter((p) => keys.has(p.date));
}

export function previousPeriod(points: TrendPoint[], days: number, now = appNow()): TrendPoint[] {
  const keys = new Set(previousCalendarPeriodDateKeys(days, now));
  return points.filter((p) => keys.has(p.date));
}

export function sumValue(points: TrendPoint[]): number {
  return points.reduce((sum, point) => sum + point.value, 0);
}

export function averageValue(points: TrendPoint[]): number {
  if (!points.length) return 0;
  return points.reduce((sum, point) => sum + point.value, 0) / points.length;
}

export function absoluteDelta(current: number, previous: number): number {
  return current - previous;
}

export function percentagePointDelta(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return current - previous;
}

export function trendPointsInIsoRange(
  points: TrendPoint[],
  from: string,
  to: string,
): TrendPoint[] {
  return points.filter((point) => point.date >= from && point.date <= to);
}

export function trendSufficiencyForDisplayRange(
  points: TrendPoint[],
  displayRange: PerformanceDateRange,
): TrendSufficiency {
  const previous = previousComparableRange(displayRange);
  const current = trendPointsInIsoRange(points, displayRange.from, displayRange.to);
  const prior = trendPointsInIsoRange(points, previous.from, previous.to);
  const daysRecorded = new Set(current.map((point) => point.date)).size;
  const previousDaysRecorded = new Set(prior.map((point) => point.date)).size;
  const recommended = Math.max(
    1,
    inclusiveRangeDayCount(displayRange.from, displayRange.to),
  );
  const sufficient =
    daysRecorded >= recommended && previousDaysRecorded >= recommended;
  return {
    sufficient,
    daysRecorded,
    previousDaysRecorded,
    recommended,
  };
}

export function compareTrendPeriodsForDisplayRange(
  points: TrendPoint[],
  metric: 'completed' | 'backflows' | 'problematic',
  displayRange: PerformanceDateRange,
): TrendComparison {
  const previous = previousComparableRange(displayRange);
  const sufficiency = trendSufficiencyForDisplayRange(points, displayRange);
  const currentPoints = trendPointsInIsoRange(points, displayRange.from, displayRange.to);
  const previousPoints = trendPointsInIsoRange(points, previous.from, previous.to);
  const descriptor = TREND_METRICS[metric];
  const current = aggregatePoints(currentPoints, descriptor.aggregation);
  const prior = aggregatePoints(previousPoints, descriptor.aggregation);
  const delta = absoluteDelta(current, prior);
  const pp = percentagePointDelta(current, prior);
  const hasSamples =
    descriptor.aggregation === 'sum' ? true : prior > 0 || current > 0;
  const sufficient = sufficiency.sufficient && hasSamples;
  const direction =
    !sufficient || (prior === 0 && current === 0 && descriptor.aggregation !== 'sum')
      ? 'unknown'
      : directionForMetric(descriptor.id, delta);

  let label = '—';
  if (sufficient) {
    if (descriptor.id === 'firstPass' && pp !== null) {
      label = `${pp > 0 ? '+' : ''}${pp.toFixed(1)} pp`;
    } else if (descriptor.id === 'avgCycle') {
      label = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} days`;
    } else if (descriptor.aggregation === 'average') {
      label = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} daily avg`;
    } else {
      label = `${delta > 0 ? '+' : ''}${Math.round(delta)}`;
    }
  }

  return {
    current,
    previous: prior,
    absoluteDelta: delta,
    percentagePointDelta: pp,
    direction,
    label,
    sufficient,
    sufficiencyMessage: sufficient ? null : sufficiencyMessage(sufficiency),
    unknown: !sufficiency.sufficient,
  };
}

export function trendSufficiency(
  points: TrendPoint[],
  periodDays: number,
  now = appNow(),
): TrendSufficiency {
  const current = currentPeriod(points, periodDays, now);
  const previous = previousPeriod(points, periodDays, now);
  const daysRecorded = new Set(current.map((point) => point.date)).size;
  const previousDays = new Set(previous.map((point) => point.date)).size;
  const sufficient =
    daysRecorded >= periodDays && previousDays >= periodDays;
  return { sufficient, daysRecorded, previousDaysRecorded: previousDays, recommended: periodDays };
}

function sampledStateSufficiency(
  points: TrendPoint[],
  periodDays: number,
  now: Date,
): TrendSufficiency {
  const current = currentPeriod(points, periodDays, now);
  const previous = previousPeriod(points, periodDays, now);
  const daysRecorded = new Set(current.map((point) => point.date)).size;
  const previousDaysRecorded = new Set(previous.map((point) => point.date)).size;
  return {
    sufficient: daysRecorded >= 7 && previousDaysRecorded >= 7,
    daysRecorded,
    previousDaysRecorded,
    recommended: 7,
  };
}

export function directionForMetric(
  metric: TrendMetricId,
  delta: number,
): TrendDirection {
  if (delta === 0) return 'flat';
  const descriptor = TREND_METRICS[metric];
  if (descriptor.favorableDirection === 'neutral') {
    return delta > 0 ? 'up' : 'down';
  }
  if (descriptor.favorableDirection === 'down') {
    return delta < 0 ? 'up' : 'down';
  }
  return delta > 0 ? 'up' : 'down';
}

function sufficiencyMessage(sufficiency: TrendSufficiency): string {
  return `Not enough history yet (${sufficiency.daysRecorded} days recorded, ${sufficiency.recommended} recommended)`;
}

/**
 * Single-series aggregation. Ratio and duration metrics are NOT computable from one derived
 * series — summing daily percentages or averages is meaningless — so they are rejected loudly.
 */
function aggregatePoints(points: TrendPoint[], aggregation: TrendAggregation): number {
  if (aggregation === 'sum') return sumValue(points);
  if (aggregation === 'average') return averageValue(points);
  throw new Error(
    `Trend aggregation "${aggregation}" needs its numerator/denominator or raw samples; use compareWeightedFirstPassTrend, compareWeightedReworkRateTrend or compareMedianDurationTrend.`,
  );
}

export function compareTrendWithAggregation(
  points: TrendPoint[],
  descriptor: Pick<TrendMetricDescriptor, 'id' | 'aggregation' | 'favorableDirection'>,
  periodDays = 28,
  now = appNow(),
  options?: { requireSamples?: boolean },
): TrendComparison {
  const sufficiency =
    descriptor.aggregation === 'average'
      ? sampledStateSufficiency(points, periodDays, now)
      : trendSufficiency(points, periodDays, now);
  const currentPoints = currentPeriod(points, periodDays, now);
  const previousPoints = previousPeriod(points, periodDays, now);

  const current = aggregatePoints(currentPoints, descriptor.aggregation);
  const previous = aggregatePoints(previousPoints, descriptor.aggregation);
  const delta = absoluteDelta(current, previous);
  const pp = percentagePointDelta(current, previous);

  const hasCoverage = sufficiency.sufficient;
  const hasSamples =
    descriptor.aggregation === 'sum'
      ? true
      : previous > 0 || current > 0;
  const sufficient = hasCoverage && (options?.requireSamples ? hasSamples : true);
  const unknown = !hasCoverage;

  const direction =
    !sufficient || (previous === 0 && current === 0 && descriptor.aggregation !== 'sum')
      ? 'unknown'
      : directionForMetric(descriptor.id, delta);

  let label = '—';
  if (sufficient) {
    if (descriptor.id === 'firstPass' && pp !== null) {
      label = `${pp > 0 ? '+' : ''}${pp.toFixed(1)} pp`;
    } else if (descriptor.id === 'avgCycle') {
      label = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} days`;
    } else if (descriptor.aggregation === 'average') {
      label = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} daily avg`;
    } else {
      label = `${delta > 0 ? '+' : ''}${Math.round(delta)}`;
    }
  }

  return {
    current,
    previous,
    absoluteDelta: delta,
    percentagePointDelta: pp,
    direction,
    label,
    sufficient,
    sufficiencyMessage: sufficient
      ? null
      : hasCoverage
        ? 'Not enough relevant samples in both comparison periods'
        : sufficiencyMessage(sufficiency),
    unknown,
  };
}

/** @deprecated Use compareTrendWithAggregation with TREND_METRICS instead. */
export function compareTrendPeriods(
  points: TrendPoint[],
  metric: 'completed' | 'backflows' | 'problematic',
  periodDays = 28,
  now = appNow(),
): TrendComparison {
  const descriptor = TREND_METRICS[metric];
  return compareTrendWithAggregation(points, descriptor, periodDays, now, {
    requireSamples: metric !== 'completed' && metric !== 'backflows',
  });
}

/**
 * Σ numerator / Σ denominator over each comparison period, as a percentage. Daily rates are never
 * summed or averaged: the numerator and denominator series are summed first.
 */
function compareWeightedRate(
  metric: 'firstPass' | 'reworkRate',
  numeratorPoints: TrendPoint[],
  denominatorPoints: TrendPoint[],
  periodDays: number,
  now: Date,
): TrendComparison {
  const sufficiency = trendSufficiency(denominatorPoints, periodDays, now);
  const currentDenominator = sumValue(currentPeriod(denominatorPoints, periodDays, now));
  const previousDenominator = sumValue(previousPeriod(denominatorPoints, periodDays, now));
  const currentNumerator = sumValue(currentPeriod(numeratorPoints, periodDays, now));
  const previousNumerator = sumValue(previousPeriod(numeratorPoints, periodDays, now));

  const current = currentDenominator > 0 ? (currentNumerator / currentDenominator) * 100 : 0;
  const previous = previousDenominator > 0 ? (previousNumerator / previousDenominator) * 100 : 0;
  const delta = absoluteDelta(current, previous);
  const pp = percentagePointDelta(current, previous);
  const sufficient =
    sufficiency.sufficient && currentDenominator > 0 && previousDenominator > 0;

  return {
    current,
    previous,
    absoluteDelta: delta,
    percentagePointDelta: pp,
    direction: sufficient ? directionForMetric(metric, delta) : 'unknown',
    label: sufficient && pp !== null ? `${pp > 0 ? '+' : ''}${pp.toFixed(1)} pp` : '—',
    sufficient,
    sufficiencyMessage: sufficient
      ? null
      : sufficiency.sufficient
        ? 'Not enough completed samples in both comparison periods'
        : sufficiencyMessage(sufficiency),
    unknown: !sufficiency.sufficient,
    currentSamples: currentDenominator,
    previousSamples: previousDenominator,
  };
}

/** First Pass trend: Σ first-pass cycles / Σ completed. */
export function compareWeightedFirstPassTrend(
  completedPoints: TrendPoint[],
  firstPassPoints: TrendPoint[],
  periodDays = 28,
  now = appNow(),
): TrendComparison {
  return compareWeightedRate('firstPass', firstPassPoints, completedPoints, periodDays, now);
}

/** Rework Rate trend: Σ reworked cycles / Σ completed. */
export function compareWeightedReworkRateTrend(
  completedPoints: TrendPoint[],
  reworkedPoints: TrendPoint[],
  periodDays = 28,
  now = appNow(),
): TrendComparison {
  return compareWeightedRate('reworkRate', reworkedPoints, completedPoints, periodDays, now);
}

/**
 * Sample-weighted MEAN duration (Σ duration / Σ samples), in business days. Secondary to the
 * pooled median; kept for callers that only have duration sums.
 */
export function compareWeightedAvgCycleTrend(
  cycleSumPoints: TrendPoint[],
  completedWithCyclePoints: TrendPoint[],
  periodDays = 28,
  now = appNow(),
): TrendComparison {
  const sufficiency = trendSufficiency(cycleSumPoints, periodDays, now);
  const currentCycleSum = sumValue(currentPeriod(cycleSumPoints, periodDays, now));
  const previousCycleSum = sumValue(previousPeriod(cycleSumPoints, periodDays, now));
  const currentCompleted = sumValue(currentPeriod(completedWithCyclePoints, periodDays, now));
  const previousCompleted = sumValue(previousPeriod(completedWithCyclePoints, periodDays, now));

  const current =
    currentCompleted > 0 ? currentCycleSum / currentCompleted : 0;
  const previous =
    previousCompleted > 0 ? previousCycleSum / previousCompleted : 0;
  const delta = absoluteDelta(current, previous);
  const sufficient =
    sufficiency.sufficient && currentCompleted > 0 && previousCompleted > 0;

  return {
    current,
    previous,
    absoluteDelta: delta,
    percentagePointDelta: null,
    direction: sufficient ? directionForMetric('avgCycle', delta) : 'unknown',
    label: sufficient ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} days` : '—',
    sufficient,
    sufficiencyMessage: sufficient
      ? null
      : sufficiency.sufficient
        ? 'Not enough completed-cycle samples in both comparison periods'
        : sufficiencyMessage(sufficiency),
    unknown: !sufficiency.sufficient,
    currentSamples: currentCompleted,
    previousSamples: previousCompleted,
  };
}

/** Minimum raw duration samples in EACH comparison period for a duration trend. */
export const MIN_DURATION_SAMPLES = 3;

export interface DurationSampleSeriesPoint {
  date: string;
  /** Raw business-time durations (ms) of cycles completed on `date`. */
  samples: number[];
}

function poolSamples(
  points: DurationSampleSeriesPoint[],
  keys: Set<string>,
): number[] {
  const pooled: number[] = [];
  for (const point of points) {
    if (keys.has(point.date)) pooled.push(...point.samples);
  }
  return pooled;
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Cycle / Execution Time trend: median of the POOLED raw samples of each period (business days).
 * Sample-aware: both periods need `MIN_DURATION_SAMPLES` samples, a day with many completions
 * weighs more than a day with one, and a mean of daily means is never used. The median is the
 * primary duration statistic of Metrics V2.
 */
export function compareMedianDurationTrend(
  samplePoints: DurationSampleSeriesPoint[],
  metric: 'cycleTime' | 'executionTime' = 'cycleTime',
  periodDays = 28,
  now = appNow(),
): TrendComparison {
  const coveragePoints = samplePoints.map((point) => ({ date: point.date, value: 1 }));
  const sufficiency = trendSufficiency(coveragePoints, periodDays, now);
  const currentKeys = new Set(calendarPeriodDateKeys(periodDays, now));
  const previousKeys = new Set(previousCalendarPeriodDateKeys(periodDays, now));
  const currentSamples = poolSamples(samplePoints, currentKeys);
  const previousSamples = poolSamples(samplePoints, previousKeys);

  const enoughSamples =
    currentSamples.length >= MIN_DURATION_SAMPLES &&
    previousSamples.length >= MIN_DURATION_SAMPLES;
  const current = currentSamples.length ? businessMsToDays(medianOf(currentSamples)) : 0;
  const previous = previousSamples.length ? businessMsToDays(medianOf(previousSamples)) : 0;
  const delta = absoluteDelta(current, previous);
  const sufficient = sufficiency.sufficient && enoughSamples;

  return {
    current,
    previous,
    absoluteDelta: delta,
    percentagePointDelta: null,
    direction: sufficient ? directionForMetric(metric, delta) : 'unknown',
    label: sufficient ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} business days` : '—',
    sufficient,
    sufficiencyMessage: sufficient
      ? null
      : sufficiency.sufficient
        ? `Not enough completed-cycle samples (${currentSamples.length} current, ${previousSamples.length} previous; at least ${MIN_DURATION_SAMPLES} each)`
        : sufficiencyMessage(sufficiency),
    unknown: !sufficiency.sufficient,
    currentSamples: currentSamples.length,
    previousSamples: previousSamples.length,
  };
}

export const TREND_METRIC_TOOLTIPS: Record<string, string> = {
  'First Pass':
    'Share of completed work that reached completion without a qualifying review backflow.',
  'Rework Rate':
    'Share of completed cycles that contained at least one qualifying review backflow: Σ reworked cycles / Σ completed.',
  'Cycle Time':
    'Median end-to-end cycle duration (business days) of the cycles completed in the period.',
  'Execution Time':
    'Median hands-on execution duration (business days) of the cycles completed in the period.',
  'Backflow Events': 'Qualifying backward status transitions during the period (sum).',
  Completed: 'Tasks completed during the period.',
};

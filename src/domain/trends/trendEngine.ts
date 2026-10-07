import {
  calendarPeriodDateKeys,
  previousCalendarPeriodDateKeys,
} from '../periods/calendarPeriod';
import type { PerformanceDateRange } from '../performance/performanceDateRange';
import {
  inclusiveRangeDayCount,
  previousComparableRange,
} from '../performance/performanceDateRange';

export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown';

export type TrendAggregation = 'sum' | 'average' | 'weighted_rate' | 'weighted_average';

export type TrendMetricId =
  | 'completed'
  | 'backflows'
  | 'firstPass'
  | 'avgCycle'
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
    label: 'Backflows',
  },
  firstPass: {
    id: 'firstPass',
    aggregation: 'weighted_rate',
    favorableDirection: 'up',
    label: 'First Pass',
  },
  avgCycle: {
    id: 'avgCycle',
    aggregation: 'weighted_average',
    favorableDirection: 'down',
    label: 'Avg cycle',
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
}

export interface TrendSufficiency {
  sufficient: boolean;
  daysRecorded: number;
  previousDaysRecorded: number;
  recommended: number;
}

export function currentPeriod(points: TrendPoint[], days: number, now = new Date()): TrendPoint[] {
  const keys = new Set(calendarPeriodDateKeys(days, now));
  return points.filter((p) => keys.has(p.date));
}

export function previousPeriod(points: TrendPoint[], days: number, now = new Date()): TrendPoint[] {
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
  metric: 'completed' | 'firstPass' | 'avgCycle' | 'backflows' | 'problematic',
  displayRange: PerformanceDateRange,
): TrendComparison {
  const previous = previousComparableRange(displayRange);
  const sufficiency = trendSufficiencyForDisplayRange(points, displayRange);
  const currentPoints = trendPointsInIsoRange(points, displayRange.from, displayRange.to);
  const previousPoints = trendPointsInIsoRange(points, previous.from, previous.to);
  const idMap: Record<string, TrendMetricId> = {
    completed: 'completed',
    backflows: 'backflows',
    firstPass: 'firstPass',
    avgCycle: 'avgCycle',
    problematic: 'problematic',
  };
  const descriptor = TREND_METRICS[idMap[metric]];
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
  now = new Date(),
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

function aggregatePoints(points: TrendPoint[], aggregation: TrendAggregation): number {
  if (aggregation === 'sum') return sumValue(points);
  if (aggregation === 'average') return averageValue(points);
  return sumValue(points);
}

export function compareTrendWithAggregation(
  points: TrendPoint[],
  descriptor: Pick<TrendMetricDescriptor, 'id' | 'aggregation' | 'favorableDirection'>,
  periodDays = 28,
  now = new Date(),
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
  metric: 'completed' | 'firstPass' | 'avgCycle' | 'backflows' | 'problematic',
  periodDays = 28,
  now = new Date(),
): TrendComparison {
  const idMap: Record<string, TrendMetricId> = {
    completed: 'completed',
    backflows: 'backflows',
    firstPass: 'firstPass',
    avgCycle: 'avgCycle',
    problematic: 'problematic',
  };
  const descriptor = TREND_METRICS[idMap[metric]];
  return compareTrendWithAggregation(points, descriptor, periodDays, now, {
    requireSamples: metric !== 'completed' && metric !== 'backflows',
  });
}

export function compareWeightedFirstPassTrend(
  completedPoints: TrendPoint[],
  firstPassPoints: TrendPoint[],
  periodDays = 28,
  now = new Date(),
): TrendComparison {
  const sufficiency = trendSufficiency(completedPoints, periodDays, now);
  const currentCompleted = sumValue(currentPeriod(completedPoints, periodDays, now));
  const previousCompleted = sumValue(previousPeriod(completedPoints, periodDays, now));
  const currentFirstPass = sumValue(currentPeriod(firstPassPoints, periodDays, now));
  const previousFirstPass = sumValue(previousPeriod(firstPassPoints, periodDays, now));

  const current =
    currentCompleted > 0 ? (currentFirstPass / currentCompleted) * 100 : 0;
  const previous =
    previousCompleted > 0 ? (previousFirstPass / previousCompleted) * 100 : 0;
  const delta = absoluteDelta(current, previous);
  const pp = percentagePointDelta(current, previous);
  const sufficient =
    sufficiency.sufficient && currentCompleted > 0 && previousCompleted > 0;

  return {
    current,
    previous,
    absoluteDelta: delta,
    percentagePointDelta: pp,
    direction: sufficient ? directionForMetric('firstPass', delta) : 'unknown',
    label: sufficient && pp !== null ? `${pp > 0 ? '+' : ''}${pp.toFixed(1)} pp` : '—',
    sufficient,
    sufficiencyMessage: sufficient
      ? null
      : sufficiency.sufficient
        ? 'Not enough completed samples in both comparison periods'
        : sufficiencyMessage(sufficiency),
    unknown: !sufficiency.sufficient,
  };
}

export function compareWeightedAvgCycleTrend(
  cycleSumPoints: TrendPoint[],
  completedWithCyclePoints: TrendPoint[],
  periodDays = 28,
  now = new Date(),
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
  };
}

export const TREND_METRIC_TOOLTIPS: Record<string, string> = {
  'First Pass':
    'Share of completed work that reached completion without a qualifying review backflow.',
  'Avg cycle':
    'Average end-to-end cycle duration for work completed in the selected period.',
  Backflows: 'Qualifying backward status transitions during the period.',
  Completed: 'Tasks completed during the period.',
};

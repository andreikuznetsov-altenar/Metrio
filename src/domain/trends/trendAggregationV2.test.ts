import { describe, expect, it } from 'vitest';
import {
  compareMedianDurationTrend,
  compareTrendWithAggregation,
  compareWeightedFirstPassTrend,
  compareWeightedReworkRateTrend,
  MIN_DURATION_SAMPLES,
  TREND_METRICS,
  type TrendPoint,
} from './trendEngine';
import { MS_PER_BUSINESS_DAY } from '../jira/dates';

const NOW = new Date('2026-10-16T12:00:00Z');

/** 56 consecutive UTC days ending on NOW: [0..27] previous period, [28..55] current period. */
function dayKeys(): string[] {
  const keys: string[] = [];
  for (let offset = 55; offset >= 0; offset--) {
    const d = new Date(NOW);
    d.setUTCDate(d.getUTCDate() - offset);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function series(valueFor: (index: number) => number): TrendPoint[] {
  return dayKeys().map((date, index) => ({ date, value: valueFor(index) }));
}

describe('Trend aggregation V2 — flow primitives', () => {
  it('First Pass is Σ first-pass / Σ completed, not a sum or mean of daily percentages', () => {
    // Current period: one busy day (20 completed, 10 first pass) and 27 days with a single
    // completion that was first pass. Previous period: 1 completed per day, none first pass.
    const completed = series((i) => (i < 28 ? 1 : i === 28 ? 20 : 1));
    const firstPass = series((i) => (i < 28 ? 0 : i === 28 ? 10 : 1));
    const trend = compareWeightedFirstPassTrend(completed, firstPass, 28, NOW);
    // (10 + 27) / (20 + 27) = 78.7%; a mean of daily percentages would give (50 + 27*100)/28 = 98.2%.
    expect(trend.current).toBeCloseTo((37 / 47) * 100, 6);
    expect(trend.previous).toBe(0);
    expect(trend.sufficient).toBe(true);
    expect(trend.currentSamples).toBe(47);
  });

  it('Rework Rate is Σ reworked cycles / Σ completed and complements First Pass', () => {
    const completed = series((i) => (i < 28 ? 2 : 3));
    const reworked = series((i) => (i < 28 ? 1 : 1));
    const firstPass = series((i) => (i < 28 ? 1 : 2));
    const rework = compareWeightedReworkRateTrend(completed, reworked, 28, NOW);
    const first = compareWeightedFirstPassTrend(completed, firstPass, 28, NOW);
    expect(rework.current).toBeCloseTo((28 / 84) * 100, 6);
    expect(rework.previous).toBeCloseTo(50, 6);
    expect(rework.current + first.current).toBeCloseTo(100, 6);
  });

  it('rejects ratio / duration aggregations on a single derived series', () => {
    const percentSeries = series(() => 80);
    for (const id of ['firstPass', 'reworkRate', 'cycleTime'] as const) {
      expect(() =>
        compareTrendWithAggregation(percentSeries, TREND_METRICS[id], 28, NOW),
      ).toThrow(/numerator\/denominator|raw samples/);
    }
  });

  it('Completed and Backflow Events are plain sums', () => {
    const trend = compareTrendWithAggregation(
      series((i) => (i < 28 ? 1 : 2)),
      TREND_METRICS.completed,
      28,
      NOW,
    );
    expect(trend.current).toBe(56);
    expect(trend.previous).toBe(28);
    const backflows = compareTrendWithAggregation(
      series((i) => (i === 40 ? 3 : 0)),
      TREND_METRICS.backflows,
      28,
      NOW,
    );
    expect(backflows.current).toBe(3);
  });
});

describe('Trend aggregation V2 — state metrics are sampled, not flow sums', () => {
  it('problematic / at-risk / overloaded are daily-average sampled state', () => {
    for (const id of ['problematic', 'atRisk', 'overloaded', 'active'] as const) {
      expect(TREND_METRICS[id].aggregation).toBe('average');
    }
    const trend = compareTrendWithAggregation(
      series((i) => (i < 28 ? 2 : 4)),
      TREND_METRICS.problematic,
      28,
      NOW,
    );
    // A flow sum would report 112 and 56; sampled state reports the level (daily average).
    expect(trend.current).toBe(4);
    expect(trend.previous).toBe(2);
  });
});

describe('Trend aggregation V2 — durations are sample-aware', () => {
  const day = (offset: number, ...daysOfWork: number[]) => ({
    date: dayKeys()[offset]!,
    samples: daysOfWork.map((d) => d * MS_PER_BUSINESS_DAY),
  });
  const every = (fn: (offset: number) => number[]) =>
    dayKeys().map((_, offset) => ({ date: dayKeys()[offset]!, samples: fn(offset).map((d) => d * MS_PER_BUSINESS_DAY) }));

  it('uses the median of pooled samples, in business days', () => {
    const points = every((offset) => (offset === 40 ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 30] : offset < 28 && offset % 7 === 0 ? [4] : []));
    const trend = compareMedianDurationTrend(points, 'cycleTime', 28, NOW);
    // Median of nine 1-day cycles and one 30-day outlier is 1 business day — a mean would say 3.9.
    expect(trend.current).toBe(1);
    expect(trend.previous).toBe(4);
    expect(trend.label).toContain('business days');
  });

  it('weights days by their sample count (no mean of daily means)', () => {
    const points = every((offset) =>
      offset === 30 ? [2, 2, 2, 2, 2] : offset === 31 ? [10] : offset < 28 && offset % 9 === 0 ? [3, 3, 3] : [],
    );
    const trend = compareMedianDurationTrend(points, 'cycleTime', 28, NOW);
    expect(trend.current).toBe(2);
    expect(trend.currentSamples).toBe(6);
  });

  it('is insufficient below the minimum sample count in either period', () => {
    const points = every((offset) => (offset === 40 ? [2, 2] : offset === 5 ? [3, 3, 3] : []));
    const trend = compareMedianDurationTrend(points, 'cycleTime', 28, NOW);
    expect(MIN_DURATION_SAMPLES).toBe(3);
    expect(trend.sufficient).toBe(false);
    expect(trend.sufficiencyMessage).toMatch(/Not enough completed-cycle samples/);
  });

  it('never divides business time by 24h', () => {
    const points = every((offset) => (offset % 4 === 0 ? [5, 5] : []));
    const trend = compareMedianDurationTrend(points, 'executionTime', 28, NOW);
    expect(trend.current).toBe(5);
    expect(day(0, 1).samples[0]).toBe(MS_PER_BUSINESS_DAY);
  });
});

import { describe, expect, it } from 'vitest';
import {
  compareTrendPeriods,
  compareTrendWithAggregation,
  compareWeightedFirstPassTrend,
  TREND_METRICS,
} from './trendEngine';

describe('trendEngine', () => {
  it('sums completed counts instead of averaging', () => {
    const points = [
      { date: '2026-02-01', value: 2 },
      { date: '2026-02-05', value: 1 },
      { date: '2026-02-10', value: 1 },
      { date: '2026-02-12', value: 1 },
      { date: '2026-02-15', value: 3 },
      { date: '2026-02-18', value: 1 },
      { date: '2026-02-19', value: 1 },
      { date: '2026-01-01', value: 4 },
      { date: '2026-01-05', value: 4 },
      { date: '2026-01-10', value: 4 },
      { date: '2026-01-12', value: 4 },
      { date: '2026-01-15', value: 4 },
      { date: '2026-01-18', value: 4 },
      { date: '2026-01-19', value: 4 },
    ];
    const now = new Date('2026-02-20T12:00:00');
    const trend = compareTrendPeriods(points, 'completed', 28, now);
    expect(trend.sufficient).toBe(true);
    expect(trend.current).toBe(10);
    expect(trend.previous).toBe(28);
  });

  it('averages state metrics like problematic instead of summing', () => {
    const points = [
      { date: '2026-02-01', value: 4 },
      { date: '2026-02-05', value: 2 },
      { date: '2026-02-10', value: 2 },
      { date: '2026-02-12', value: 2 },
      { date: '2026-02-15', value: 2 },
      { date: '2026-02-18', value: 2 },
      { date: '2026-02-19', value: 2 },
      { date: '2026-01-01', value: 6 },
      { date: '2026-01-05', value: 6 },
      { date: '2026-01-10', value: 6 },
      { date: '2026-01-12', value: 6 },
      { date: '2026-01-15', value: 6 },
      { date: '2026-01-18', value: 6 },
      { date: '2026-01-19', value: 6 },
    ];
    const now = new Date('2026-02-20T12:00:00');
    const trend = compareTrendWithAggregation(points, TREND_METRICS.problematic, 28, now);
    expect(trend.sufficient).toBe(true);
    expect(trend.current).toBeCloseTo(2.29, 1);
    expect(trend.previous).toBe(6);
  });

  it('weights first pass by completed sample count', () => {
    const completed = [
      { date: '2026-02-01', value: 10 },
      { date: '2026-01-01', value: 10 },
    ];
    const firstPass = [
      { date: '2026-02-01', value: 9 },
      { date: '2026-01-01', value: 5 },
    ];
    const now = new Date('2026-02-20T12:00:00');
    const trend = compareWeightedFirstPassTrend(completed, firstPass, 28, now);
    expect(trend.current).toBe(90);
    expect(trend.previous).toBe(50);
  });

  it('reports insufficient history instead of misleading zero deltas', () => {
    const points = [{ date: '2026-02-19', value: 1 }];
    const trend = compareTrendPeriods(points, 'completed', 28, new Date('2026-02-20T12:00:00'));
    expect(trend.sufficient).toBe(false);
    expect(trend.label).toBe('—');
    expect(trend.sufficiencyMessage).toContain('Not enough history yet');
  });
});

import { describe, expect, it } from 'vitest';
import {
  areaPathFromPoints,
  buildTrendChartGeometry,
  linePathFromPoints,
  smoothPathFromPoints,
} from './teamPdfChart';

describe('team PDF chart geometry', () => {
  it('keeps flat series readable away from the chart bottom', () => {
    const geometry = buildTrendChartGeometry([3.2, 3.2, 3.2], 248, 72, 14, 14);
    expect(geometry).not.toBeNull();
    const yValues = geometry?.linePoints.map((point) => point.y) ?? [];
    expect(new Set(yValues).size).toBe(1);
    expect(yValues[0]).toBeGreaterThan(24);
    expect(yValues[0]).toBeLessThan(48);
  });

  it('produces rounded-friendly paths for continuous and discrete metrics', () => {
    const geometry = buildTrendChartGeometry([1, 4, 2], 248, 72, 14, 14);
    expect(geometry).not.toBeNull();
    const points = geometry?.linePoints ?? [];
    expect(smoothPathFromPoints(points)).toContain(' C ');
    expect(linePathFromPoints(points)).toContain(' L ');
    expect(areaPathFromPoints(points, geometry?.baselineY ?? 0)).toMatch(/^M .* Z$/);
  });
});

import type { KpiSnapshotFile } from "./types";
import { getLocalDateKey } from "../periods/dateRange";
import { teamSparklinePoints, teamTrendPoints } from "./snapshotEngine";

function mergeRateSeries(
  numerator: { date: string; value: number }[],
  denominator: { date: string; value: number }[],
): { date: string; value: number }[] {
  const denomByDate = new Map(denominator.map((p) => [p.date, p.value]));
  return numerator
    .map((point) => {
      const completed = denomByDate.get(point.date) ?? 0;
      if (completed <= 0) return null;
      return {
        date: point.date,
        value: Math.round((point.value / completed) * 1000) / 10,
      };
    })
    .filter((p): p is { date: string; value: number } => p != null);
}

function mergeRatioSeries(
  sumPoints: { date: string; value: number }[],
  countPoints: { date: string; value: number }[],
  scale = 1,
): { date: string; value: number }[] {
  const countByDate = new Map(countPoints.map((p) => [p.date, p.value]));
  return sumPoints
    .map((point) => {
      const count = countByDate.get(point.date) ?? 0;
      if (count <= 0) return null;
      return {
        date: point.date,
        value: Math.round((point.value / count) * scale * 100) / 100,
      };
    })
    .filter((p): p is { date: string; value: number } => p != null);
}

/** Daily first-pass rate (%) for team sparklines. */
export function teamFirstPassRateSparklinePoints(
  file: KpiSnapshotFile,
  days = 56,
  now = new Date(),
): { date: string; value: number }[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = getLocalDateKey(cutoff);
  const completed = teamSparklinePoints(file, "completedOnDate", days, now);
  const firstPass = teamSparklinePoints(file, "firstPassOnDate", days, now);
  return mergeRateSeries(firstPass, completed).filter((p) => p.date >= cutoffKey);
}

/** Daily average cycle (days) for team sparklines. */
export function teamAvgCycleDaysSparklinePoints(
  file: KpiSnapshotFile,
  days = 56,
  now = new Date(),
): { date: string; value: number }[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = getLocalDateKey(cutoff);
  const sumMs = teamTrendPoints(file, "cycleMsSumOnDate");
  const counts = teamTrendPoints(file, "completedWithCycleOnDate");
  const cutoffFilter = (p: { date: string }) => p.date >= cutoffKey;
  const windowDays = 56;
  const sumWindow = teamSparklinePoints(file, "cycleMsSumOnDate", windowDays, now);
  const countWindow = teamSparklinePoints(file, "completedWithCycleOnDate", windowDays, now);
  void sumMs;
  void counts;
  return mergeRatioSeries(sumWindow, countWindow, 1 / (24 * 60 * 60 * 1000)).filter(
    cutoffFilter,
  );
}

export function sparklineValuesFromPoints(points: { value: number }[]): number[] {
  return points.map((p) => p.value);
}

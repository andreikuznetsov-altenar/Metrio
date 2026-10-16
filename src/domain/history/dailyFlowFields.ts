/**
 * Daily FLOW primitives stored in KPI snapshots. Flow metrics are events that happened on a
 * day, so periods aggregate them by summation of raw primitives:
 *
 *   Completed       = Σ completedOnDate
 *   Backflow Events = Σ backflowsOnDate
 *   First Pass      = Σ firstPassOnDate  / Σ completedOnDate
 *   Rework Rate     = Σ reworkedCyclesOnDate / Σ completedOnDate
 *   Cycle / Execution Time = pooled median of the raw duration samples (never a mean of daily
 *                            means, never a sum of daily percentages)
 *
 * Duration samples are business-time milliseconds, one entry per qualifying completed cycle.
 */
import type { CanonicalPerformanceCycle } from '../workflows/canonicalPerformance';

export interface DailyFlowFields {
  completedOnDate: number;
  backflowsOnDate: number;
  firstPassOnDate: number;
  /** Completed cycles that contained at least one qualifying backflow (Completed − First Pass). */
  reworkedCyclesOnDate: number;
  cycleMsSumOnDate: number;
  completedWithCycleOnDate: number;
  cycleMsSamplesOnDate: number[];
  executionMsSamplesOnDate: number[];
}

export function emptyDailyFlow(): DailyFlowFields {
  return {
    completedOnDate: 0,
    backflowsOnDate: 0,
    firstPassOnDate: 0,
    reworkedCyclesOnDate: 0,
    cycleMsSumOnDate: 0,
    completedWithCycleOnDate: 0,
    cycleMsSamplesOnDate: [],
    executionMsSamplesOnDate: [],
  };
}

/** Add one completed cycle to a day bucket. `contributorCanonical` scopes execution to a person. */
export function addCompletedCycleToDailyFlow(
  bucket: DailyFlowFields,
  cycle: Pick<
    CanonicalPerformanceCycle,
    'isFirstPass' | 'cycleMs' | 'executionMs' | 'executionMsByOwner'
  >,
  contributorCanonical?: string,
): void {
  bucket.completedOnDate += 1;
  if (cycle.isFirstPass) bucket.firstPassOnDate += 1;
  else bucket.reworkedCyclesOnDate += 1;
  if (cycle.cycleMs !== null) {
    bucket.cycleMsSumOnDate += cycle.cycleMs;
    bucket.completedWithCycleOnDate += 1;
    bucket.cycleMsSamplesOnDate.push(cycle.cycleMs);
  }
  const execution = contributorCanonical
    ? (cycle.executionMsByOwner[contributorCanonical] ?? 0)
    : cycle.executionMs;
  if (execution > 0) bucket.executionMsSamplesOnDate.push(execution);
}

/** Sum day buckets (team totals from person buckets). Samples are pooled, not averaged. */
export function sumDailyFlow(rows: readonly DailyFlowFields[]): DailyFlowFields {
  const total = emptyDailyFlow();
  for (const row of rows) {
    total.completedOnDate += row.completedOnDate;
    total.backflowsOnDate += row.backflowsOnDate;
    total.firstPassOnDate += row.firstPassOnDate;
    total.reworkedCyclesOnDate += row.reworkedCyclesOnDate;
    total.cycleMsSumOnDate += row.cycleMsSumOnDate;
    total.completedWithCycleOnDate += row.completedWithCycleOnDate;
    total.cycleMsSamplesOnDate.push(...row.cycleMsSamplesOnDate);
    total.executionMsSamplesOnDate.push(...row.executionMsSamplesOnDate);
  }
  return total;
}

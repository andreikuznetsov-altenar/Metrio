import { isDateWithinRange } from './dates';
import type { CompletedCycle, CycleSegment, ReportParams } from './types';

/** Full cycle counts toward KPI when Review→Done completion falls in the reporting window. */
export function isCompletedCycleInReportingPeriod(
  cycle: CompletedCycle,
  params: ReportParams,
): boolean {
  const endedAt = cycle.reviewToDone?.endedAt;
  if (!endedAt) return false;
  return isDateWithinRange(endedAt, params);
}

export function isHoldSegmentInReportingPeriod(
  segment: CycleSegment,
  params: ReportParams,
): boolean {
  if (segment.type !== 'progress_to_hold') return false;
  if (!segment.endedAt) return false;
  return isDateWithinRange(segment.endedAt, params);
}

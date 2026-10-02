import type { FeedbackCadence, FeedbackCycle } from './feedbackCycleTypes';
import { getLocalWeekKey } from '../digests/digestIds';
import { getLocalDateKey } from '../periods/dateRange';

export function periodKeyForCadence(cadence: FeedbackCadence, now = new Date()): string {
  if (cadence.unit === 'weekly' || cadence.unit === 'biweekly') {
    const week = getLocalWeekKey(now);
    if (cadence.unit === 'weekly') return week;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekNum = Math.floor(
      (d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 604800000,
    );
    return weekNum % 2 === 0 ? `biweekly-${week}` : `biweekly-skip-${week}`;
  }
  const month = getLocalDateKey(now).slice(0, 7);
  return `month-${month}`;
}

export function shouldEvaluateCycle(cycle: FeedbackCycle): boolean {
  if (cycle.status !== 'active' || !cycle.cadence) return false;
  return true;
}

export function cycleNeedsNewRun(
  cycle: FeedbackCycle,
  existingPeriodKeys: Set<string>,
  now = new Date(),
): { needed: boolean; periodKey: string } | null {
  if (!shouldEvaluateCycle(cycle) || !cycle.cadence) return null;
  const periodKey = `${cycle.id}:${periodKeyForCadence(cycle.cadence, now)}`;
  if (existingPeriodKeys.has(periodKey)) {
    return { needed: false, periodKey };
  }
  return { needed: true, periodKey };
}

export function daysSinceHire(hireDate: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(hireDate);
  if (!match) return null;
  const hire = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.round((today.getTime() - hire.getTime()) / 86_400_000);
}

export function onboardingTriggerDay(
  hireDate: string,
  configuredDays: number[],
  now = new Date(),
): number | null {
  const elapsed = daysSinceHire(hireDate, now);
  if (elapsed == null) return null;
  const sorted = [...configuredDays].sort((a, b) => a - b);
  for (const day of sorted) {
    if (elapsed === day) return day;
  }
  return null;
}

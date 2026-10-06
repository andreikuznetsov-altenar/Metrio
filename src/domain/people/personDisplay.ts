import type { Person } from './types';
import type { ReportParams } from '../jira/types';
import { getOperationalIssues } from './ownedIssues';
import { countActiveIssues, type WorkloadResult } from '../workload/workloadEngine';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import { formatDuration } from '../jira/dates';
import { workloadDisplayLabel } from '../workload/workloadDisplay';
import {
  CAPACITY_INSUFFICIENT_LABEL,
  capacityPresentationLabel,
  capacityDataStateFromWorkload,
  type CapacityPresentationLabel,
} from '../workload/capacityPresentation';
import type { WorkloadRow } from '../performance';

export function personRouteKey(person: Person): string {
  return person.jira?.canonicalKey || person.bamboo.workEmail || person.id;
}

/** Maps Jira report grouped keys to Metrio person ids for avatars and navigation. */
export function buildPersonReportKeyIndex(persons: Person[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const person of persons) {
    index[personRouteKey(person)] = person.id;
  }
  return index;
}

export function firstPassPercent(person: Person): number {
  const perf = person.performance;
  if (!perf || !perf.completedCount) return 0;
  return Math.round((perf.firstPassAcceptedCount / perf.completedCount) * 10000) / 100;
}

export function personActiveCount(person: Person, params: ReportParams | null): number {
  if (!params) return person.workload?.activeCount ?? 0;
  return countActiveIssues(getOperationalIssues(person), params);
}

export function personProblematicCount(person: Person, params: ReportParams | null): number {
  if (!params) return person.workload?.problematicCount ?? 0;
  return getOperationalIssues(person).filter(
    (i) => classifyTaskHealth({ issue: i, params }).status === 'problematic',
  ).length;
}

export function personAtRiskCount(person: Person, params: ReportParams | null): number {
  if (!params) return person.workload?.atRiskCount ?? 0;
  return getOperationalIssues(person).filter(
    (i) => classifyTaskHealth({ issue: i, params }).status === 'at_risk',
  ).length;
}

export function avgCycleLabel(person: Person): string {
  const perf = person.performance;
  if (!perf) return '—';
  const segments = avgCycleSegments(person);
  if (!segments.length) return '—';
  return segments.map((segment) => `${segment.label} ${segment.value}`).join(' · ');
}

export function avgCycleSegments(
  person: Person,
): { label: string; value: string }[] {
  const perf = person.performance;
  if (!perf) return [];
  const segments: { label: string; value: string }[] = [];
  if (perf.avgProgressToReviewMs) {
    segments.push({
      label: 'P → R',
      value: formatDuration(perf.avgProgressToReviewMs),
    });
  }
  if (perf.avgReviewToDoneMs) {
    segments.push({
      label: 'R → D',
      value: formatDuration(perf.avgReviewToDoneMs),
    });
  }
  return segments;
}

export function availabilityTagVariant(
  state: Person['availability']['state'],
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (state === 'available') return 'success';
  if (state === 'on_vacation' || state === 'returns_today') return 'info';
  if (state === 'vacation_tomorrow' || state === 'vacation_soon') return 'warning';
  return 'neutral';
}

export function workloadTagVariant(level: string | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (level === 'overloaded') return 'danger';
  if (level === 'high') return 'warning';
  if (level === 'low') return 'success';
  return 'neutral';
}

export function formatWorkloadLabel(
  level: string | undefined,
  context?: {
    workload?: WorkloadResult | null;
    availability?: Person['availability'];
  },
): string {
  if (context) {
    return capacityPresentationLabel(context.workload ?? null, context.availability);
  }
  return workloadDisplayLabel(level);
}

export function workloadLabelForPerson(person: Person | undefined): CapacityPresentationLabel {
  if (!person) return CAPACITY_INSUFFICIENT_LABEL;
  const state = capacityDataStateFromWorkload(person.workload ?? null);
  if (state === "insufficient_history") {
    return CAPACITY_INSUFFICIENT_LABEL;
  }
  return workloadDisplayLabel(person.workload?.level);
}

export function buildWorkloadRowFields(
  person: Person | undefined,
  counts: { activeWork: number; atRisk: number },
): Pick<WorkloadRow, 'workload' | 'capacityDataState' | 'availability' | 'activeWork' | 'atRisk'> & {
  capacityLoadPercent?: number;
  estimatedMonthlyHours?: number;
  monthlyCapacityHours?: number;
} {
  const capacityDataState = capacityDataStateForPerson(person);
  const workload =
    capacityDataState === 'insufficient_history'
      ? CAPACITY_INSUFFICIENT_LABEL
      : workloadLabelForPerson(person);
  const base = {
    activeWork: counts.activeWork,
    atRisk: counts.atRisk,
    workload,
    capacityDataState,
    availability: person?.availability.label || '—',
  };
  if (person?.workload?.capacityLoadPercent != null && capacityDataState === "measured") {
    return {
      ...base,
      capacityLoadPercent: person.workload.capacityLoadPercent,
      estimatedMonthlyHours: person.workload.estimatedMonthlyHours,
      monthlyCapacityHours: person.workload.monthlyCapacityHours,
    };
  }
  return base;
}

export function capacityDataStateForPerson(person: Person | undefined) {
  return capacityDataStateFromWorkload(person?.workload ?? null);
}

import { firstPassPercentFromCounts } from '../performance/reworkRate';
import { resolveAvailabilityPresentation } from '../availability/availabilityPresentation';
import type { Person } from './types';
import type { ReportParams } from '../jira/types';
import { getOperationalIssues } from './ownedIssues';
import { countActiveIssues, type WorkloadResult } from '../workload/workloadEngine';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import { formatBusinessDuration } from '../jira/dates';
import { workloadDisplayLabel, type WorkloadDisplayLabel } from '../workload/workloadDisplay';
import {
  capacityDataStateFromWorkload,
} from '../workload/capacityPresentation';
import type { WorkloadRow } from '../performance';

import { appNow } from "../../platform/appClock";
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
  if (!perf) return 0;
  // First Pass = completed cycles without rework, coordinated with Rework Rate (adds up to 100).
  return firstPassPercentFromCounts(perf) ?? perf.firstPassRatePercent ?? 0;
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
  if (perf.medianExecutionMs) {
    segments.push({
      label: 'Execution',
      value: formatBusinessDuration(perf.medianExecutionMs),
    });
  }
  if (perf.medianCycleMs) {
    segments.push({
      label: 'Cycle',
      value: formatBusinessDuration(perf.medianCycleMs),
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

/** Badge variant from the shared availability phase (never from a possibly stale persisted state). */
export function availabilityPhaseVariant(
  availability: Person['availability'],
  today: Date = appNow(),
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (resolveAvailabilityPresentation(availability, today).phase) {
    case 'available':
      return 'success';
    case 'upcoming':
      return 'warning';
    default:
      return 'info';
  }
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
  return workloadDisplayLabel(context?.workload?.level ?? level);
}

export function currentWorkloadForPerson(person: Person | undefined): WorkloadResult | null {
  return person?.personalWorkload ?? person?.workload ?? null;
}

export function workloadLabelForPerson(person: Person | undefined): WorkloadDisplayLabel {
  return workloadDisplayLabel(currentWorkloadForPerson(person)?.level);
}

export function buildWorkloadRowFields(
  person: Person | undefined,
  counts: { activeWork: number; atRisk: number },
): Pick<WorkloadRow, 'workload' | 'capacityDataState' | 'availability' | 'activeWork' | 'assignedWork' | 'atRisk'> & {
  capacityLoadPercent?: number;
  estimatedMonthlyHours?: number;
  monthlyCapacityHours?: number;
  currentLoadPercent?: number;
  expectedEffortHours?: number;
  availableHoursInHorizon?: number;
} {
  const currentWorkload = currentWorkloadForPerson(person);
  const capacityDataState = capacityDataStateFromWorkload(currentWorkload);
  const workload = workloadLabelForPerson(person);
  const base = {
    activeWork: counts.activeWork,
    assignedWork: currentWorkload?.currentAssignedIssueCount ?? counts.activeWork,
    atRisk: counts.atRisk,
    workload,
    capacityDataState,
    availability: person ? resolveAvailabilityPresentation(person.availability).badgeLabel : '—',
    currentLoadPercent: currentWorkload?.currentLoadPercent,
    expectedEffortHours: currentWorkload?.expectedEffortHours,
    availableHoursInHorizon: currentWorkload?.availableHoursInHorizon,
  };
  if (currentWorkload?.capacityLoadPercent != null && capacityDataState === "measured") {
    return {
      ...base,
      capacityLoadPercent: currentWorkload.capacityLoadPercent,
      estimatedMonthlyHours: currentWorkload.estimatedMonthlyHours,
      monthlyCapacityHours: currentWorkload.monthlyCapacityHours,
    };
  }
  return base;
}

export function capacityDataStateForPerson(person: Person | undefined) {
  return capacityDataStateFromWorkload(currentWorkloadForPerson(person));
}

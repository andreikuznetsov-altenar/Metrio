import type { Person } from './types';
import type { ReportParams } from '../jira/types';
import { countActiveIssues } from '../workload/workloadEngine';
import { classifyTaskHealth } from '../task-health/taskHealthEngine';
import { formatDuration } from '../jira/dates';

export function personRouteKey(person: Person): string {
  return person.jira?.canonicalKey || person.bamboo.workEmail || person.id;
}

export function firstPassPercent(person: Person): number {
  const perf = person.performance;
  if (!perf || !perf.completedCount) return 0;
  return Math.round((perf.firstPassAcceptedCount / perf.completedCount) * 10000) / 100;
}

export function personActiveCount(person: Person, params: ReportParams | null): number {
  if (!params) return person.workload?.activeCount ?? 0;
  return countActiveIssues(person.issues, params);
}

export function personProblematicCount(person: Person, params: ReportParams | null): number {
  if (!params) return person.workload?.problematicCount ?? 0;
  return person.issues.filter(
    (i) => classifyTaskHealth({ issue: i, params }).status === 'problematic',
  ).length;
}

export function personAtRiskCount(person: Person, params: ReportParams | null): number {
  if (!params) return person.workload?.atRiskCount ?? 0;
  return person.issues.filter(
    (i) => classifyTaskHealth({ issue: i, params }).status === 'at_risk',
  ).length;
}

export function avgCycleLabel(person: Person): string {
  const perf = person.performance;
  if (!perf) return '—';
  const parts: string[] = [];
  if (perf.avgProgressToReviewMs) parts.push(`P→R ${formatDuration(perf.avgProgressToReviewMs)}`);
  if (perf.avgReviewToDoneMs) parts.push(`R→D ${formatDuration(perf.avgReviewToDoneMs)}`);
  return parts.length ? parts.join(' · ') : '—';
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

export function formatWorkloadLabel(level: string | undefined): string {
  if (level === 'overloaded') return 'Overloaded';
  if (level === 'high') return 'High';
  if (level === 'low') return 'Low';
  return 'Normal';
}

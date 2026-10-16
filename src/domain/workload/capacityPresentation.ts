import type { PersonAvailability } from '../people/types';
import type { WorkloadRow } from '../performance';
import {
  capacityLevelFromPercent,
  type CapacityDataState,
  resolveCapacityDataState,
} from '../workflows/capacityWorkload';
import type { WorkloadResult } from './workloadEngine';
import { workloadDisplayLabel, type WorkloadDisplayLabel } from './workloadDisplay';

export const CAPACITY_INSUFFICIENT_LABEL = 'Not enough history' as const;

export type CapacityPresentationLabel = WorkloadDisplayLabel | typeof CAPACITY_INSUFFICIENT_LABEL;

export const CAPACITY_INSUFFICIENT_TOOLTIP =
  'No completed work cycles in the selected period. Current Jira work is shown separately.';

function isAway(availability?: PersonAvailability): boolean {
  if (!availability) return false;
  return (
    availability.state === 'on_vacation' ||
    availability.state === 'returns_today' ||
    availability.isHoliday
  );
}

export function capacityDataStateFromWorkload(
  workload: WorkloadResult | null | undefined,
): CapacityDataState {
  if (!workload) return 'insufficient_history';
  const breakdownState = workload.capacityBreakdown?.capacityDataState;
  if (breakdownState) return breakdownState;
  if (workload.capacityDataState) return workload.capacityDataState;
  const completed = workload.capacityBreakdown?.completedCyclesInPeriod ?? 0;
  if (completed <= 0) return 'insufficient_history';
  return resolveCapacityDataState(completed);
}

/**
 * User-facing Light / Balanced / Heavy / Overloaded label. It is the CURRENT workload level
 * (open Jira queue); historical capacity (completed-cycle hours / percent) never decides it.
 */
export function capacityPresentationLabel(
  workload: WorkloadResult | null | undefined,
  availability?: PersonAvailability,
): CapacityPresentationLabel {
  if (!workload) {
    return CAPACITY_INSUFFICIENT_LABEL;
  }
  if (isAway(availability)) {
    return CAPACITY_INSUFFICIENT_LABEL;
  }
  return workloadDisplayLabel(workload.level);
}

export function isMeasuredCapacityLabel(label: CapacityPresentationLabel): label is WorkloadDisplayLabel {
  return label !== CAPACITY_INSUFFICIENT_LABEL;
}

export function employeeCapacityKpi(input: {
  workload: WorkloadResult | null;
  availability?: PersonAvailability;
}): Pick<WorkloadRow, 'capacityDataState'> & {
  value: string;
  badgeLabel: string;
  badgeVariant: 'neutral' | 'success' | 'warning' | 'danger';
  tooltip: string;
} {
  const wl = input.workload;
  const assigned = wl?.currentAssignedIssueCount ?? 0;
  const active = wl?.activeWorkCount ?? wl?.activeCount ?? 0;
  const operational = `${assigned} assigned · ${active} active`;
  const state = capacityDataStateFromWorkload(wl);

  if (isAway(input.availability)) {
    return {
      capacityDataState: 'insufficient_history',
      value: '—',
      badgeLabel: input.availability?.label || 'Away',
      badgeVariant: 'neutral',
      tooltip: `${input.availability?.label || 'Away'}. ${CAPACITY_INSUFFICIENT_TOOLTIP}`,
    };
  }

  // The badge is the CURRENT workload level; the percentage is the separate historical
  // elapsed-business-time capacity metric and is only shown when it was measured.
  const label = wl ? workloadDisplayLabel(wl.level) : CAPACITY_INSUFFICIENT_LABEL;
  if (state === 'insufficient_history' || !wl) {
    return {
      capacityDataState: 'insufficient_history',
      value: '—',
      badgeLabel: label,
      badgeVariant: label === 'Overloaded' ? 'danger' : label === 'Heavy' ? 'warning' : label === 'Light' ? 'success' : 'neutral',
      tooltip: `${operational}. ${CAPACITY_INSUFFICIENT_TOOLTIP}`,
    };
  }

  const percent = wl.capacityLoadPercent ?? 0;
  return {
    capacityDataState: 'measured',
    value: `${Math.round(percent)}%`,
    badgeLabel: label,
    badgeVariant:
      label === 'Overloaded'
        ? 'danger'
        : label === 'Heavy'
          ? 'warning'
          : label === 'Light'
            ? 'success'
            : 'neutral',
    tooltip: `${operational}. The level reflects the current Jira queue; ${Math.round(percent)}% is historical elapsed business time of completed cycles (not hours worked).`,
  };
}

export interface TeamCapacityKpiSummary {
  value: string;
  badgeLabel: string;
  badgeVariant: 'neutral' | 'success' | 'warning' | 'danger';
  tooltip: string;
}

/**
 * Team-level count of elevated people. Uses each row's CURRENT workload label (the same label the
 * People table shows); historical capacity percent is not consulted.
 */
export function teamCapacityKpiFromRows(workload: WorkloadRow[]): TeamCapacityKpiSummary {
  const rated = workload.filter((row) => row.workload !== CAPACITY_INSUFFICIENT_LABEL);
  const unrated = workload.length - rated.length;
  const overloaded = rated.filter((row) => row.workload === 'Overloaded').length;
  const heavy = rated.filter((row) => row.workload === 'Heavy').length;
  const hot = overloaded + heavy;

  if (rated.length === 0) {
    return {
      value: '—',
      badgeLabel: CAPACITY_INSUFFICIENT_LABEL,
      badgeVariant: 'neutral',
      tooltip: 'No team members have a current workload to rate.',
    };
  }

  const unratedSuffix = unrated > 0 ? ` · ${unrated} away or unrated` : '';

  if (hot === 0) {
    return {
      value: '0',
      badgeLabel: 'Balanced',
      badgeVariant: 'neutral',
      tooltip: `0 overloaded · 0 heavy across the current Jira queues${unratedSuffix}.`,
    };
  }

  return {
    value: String(hot),
    badgeLabel: hot === 1 ? '1 elevated' : `${hot} elevated`,
    badgeVariant: overloaded > 0 ? 'danger' : 'warning',
    tooltip: `${heavy} heavy · ${overloaded} overloaded (current Jira queues)${unratedSuffix}.`,
  };
}

/** For tests: derive measured label from percent without completed-cycle guard. */
export function measuredCapacityLabelFromPercent(loadPercent: number): WorkloadDisplayLabel {
  return workloadDisplayLabel(capacityLevelFromPercent(loadPercent));
}

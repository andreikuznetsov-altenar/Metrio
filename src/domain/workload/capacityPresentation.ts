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
 * (open Jira queue); Historical load never decides it.
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

  // Badge and value are both CURRENT workload (open Jira queue demand against available hours).
  // Historical load is a different measurement and only appears, explicitly labelled, in the tooltip.
  const label = wl ? workloadDisplayLabel(wl.level) : CAPACITY_INSUFFICIENT_LABEL;
  const variant: 'neutral' | 'success' | 'warning' | 'danger' =
    label === 'Overloaded' ? 'danger' : label === 'Heavy' ? 'warning' : label === 'Light' ? 'success' : 'neutral';
  const currentPercent = wl?.currentLoadPercent;
  const historical =
    wl && state === 'measured' && wl.capacityLoadPercent != null
      ? ` Historical load (separate): ${Math.round(wl.capacityLoadPercent)}% = merged hands-on business-window occupancy / available scheduled hours, not hours worked.`
      : '';
  if (!wl || currentPercent == null) {
    return {
      capacityDataState: 'insufficient_history',
      value: '—',
      badgeLabel: label,
      badgeVariant: variant,
      tooltip: `${operational}. ${CAPACITY_INSUFFICIENT_TOOLTIP}`,
    };
  }

  return {
    capacityDataState: state,
    value: `${Math.round(currentPercent)}%`,
    badgeLabel: label,
    badgeVariant: variant,
    tooltip: `${operational}. Current workload: ~${wl.expectedEffortHours ?? 0}h of expected effort over ${wl.availableHoursInHorizon ?? 0}h available in the planning horizon.${historical}`,
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

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
  const completed = workload.capacityBreakdown?.completedCyclesInPeriod ?? 0;
  if (completed <= 0) return 'insufficient_history';
  if (workload.capacityDataState === 'measured') return 'measured';
  return resolveCapacityDataState(completed);
}

export function capacityPresentationLabel(
  workload: WorkloadResult | null | undefined,
  availability?: PersonAvailability,
): CapacityPresentationLabel {
  if (capacityDataStateFromWorkload(workload) === 'insufficient_history') {
    return CAPACITY_INSUFFICIENT_LABEL;
  }
  if (isAway(availability)) {
    return CAPACITY_INSUFFICIENT_LABEL;
  }
  return workloadDisplayLabel(workload?.level);
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

  if (state === 'insufficient_history') {
    return {
      capacityDataState: state,
      value: '—',
      badgeLabel: CAPACITY_INSUFFICIENT_LABEL,
      badgeVariant: 'neutral',
      tooltip: `${CAPACITY_INSUFFICIENT_TOOLTIP} ${operational}.`,
    };
  }

  const label = workloadDisplayLabel(wl?.level);
  const percent = wl?.capacityLoadPercent ?? 0;
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
    tooltip: `${operational}. Measured from completed contributor cycles in this period.`,
  };
}

export interface TeamCapacityKpiSummary {
  value: string;
  badgeLabel: string;
  badgeVariant: 'neutral' | 'success' | 'warning' | 'danger';
  tooltip: string;
}

export function teamCapacityKpiFromRows(workload: WorkloadRow[]): TeamCapacityKpiSummary {
  const measured = workload.filter((row) => row.capacityDataState !== 'insufficient_history');
  const insufficient = workload.length - measured.length;
  const overloaded = measured.filter((row) => row.workload === 'Overloaded').length;
  const heavy = measured.filter((row) => row.workload === 'Heavy').length;
  const hot = overloaded + heavy;

  if (measured.length === 0) {
    return {
      value: '—',
      badgeLabel: CAPACITY_INSUFFICIENT_LABEL,
      badgeVariant: 'neutral',
      tooltip: 'No team members have enough completed cycle history in this period.',
    };
  }

  if (hot === 0 && insufficient === 0) {
    return {
      value: '0',
      badgeLabel: 'Balanced',
      badgeVariant: 'neutral',
      tooltip: '0 overloaded · 0 heavy across measured team members.',
    };
  }

  if (hot === 0) {
    return {
      value: '0',
      badgeLabel: 'Balanced',
      badgeVariant: 'neutral',
      tooltip: `${insufficient} without enough history · 0 overloaded · 0 heavy.`,
    };
  }

  const historySuffix =
    insufficient > 0 ? ` · ${insufficient} without enough history` : '';

  return {
    value: String(hot),
    badgeLabel: hot === 1 ? '1 elevated' : `${hot} elevated`,
    badgeVariant: overloaded > 0 ? 'danger' : 'warning',
    tooltip: `${heavy} heavy · ${overloaded} overloaded${historySuffix}.`,
  };
}

/** For tests: derive measured label from percent without completed-cycle guard. */
export function measuredCapacityLabelFromPercent(loadPercent: number): WorkloadDisplayLabel {
  return workloadDisplayLabel(capacityLevelFromPercent(loadPercent));
}

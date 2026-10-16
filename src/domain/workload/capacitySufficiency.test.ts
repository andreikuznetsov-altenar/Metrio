import { describe, expect, it } from 'vitest';
import { resolveCapacityDataState } from '../workflows/capacityWorkload';
import {
  CAPACITY_INSUFFICIENT_LABEL,
  capacityPresentationLabel,
  employeeCapacityKpi,
  measuredCapacityLabelFromPercent,
  teamCapacityKpiFromRows,
} from './capacityPresentation';
import { capacityDistribution } from '../home/executiveDashboardModel';
import type { WorkloadRow } from '../performance';
import { testWorkload } from '../testFixtures';

describe('capacity data sufficiency (WF8.1)', () => {
  it('CASE A: zero completed cycles → capacity not measured, but the current-queue label still shows', () => {
    const state = resolveCapacityDataState(0);
    expect(state).toBe('insufficient_history');

    const workload = testWorkload({
      level: 'normal',
      capacityDataState: 'insufficient_history',
      capacityLoadPercent: 0,
      currentAssignedIssueCount: 17,
      activeWorkCount: 3,
      capacityBreakdown: {
        completedCycleHours: 0,
        activeSegmentHours: 0,
        avgHoursPerCycle: 0,
        completedCyclesInPeriod: 0,
        daysInPeriod: 30,
        monthlyQuantity: 0,
        estimatedMonthlyHours: 0,
        capacityLoadPercent: 0,
        capacityDataState: 'insufficient_history',
      },
    });

    // Current workload comes from the open Jira queue (level 'normal' = Balanced); the missing
    // completed-cycle history only means the historical capacity percentage is not measured.
    const label = capacityPresentationLabel(workload);
    expect(label).toBe('Balanced');

    const kpi = employeeCapacityKpi({ workload });
    expect(kpi.badgeLabel).toBe('Balanced');
    expect(kpi.value).toBe('—');
    expect(kpi.capacityDataState).toBe('insufficient_history');

    const row: WorkloadRow = {
      personId: 'p1',
      activeWork: 3,
      atRisk: 0,
      workload: CAPACITY_INSUFFICIENT_LABEL,
      capacityDataState: 'insufficient_history',
      availability: 'Available',
    };
    const distribution = capacityDistribution([row]);
    expect(distribution.find((d) => d.label === 'Light')?.count).toBe(0);
    expect(distribution.find((d) => d.label === CAPACITY_INSUFFICIENT_LABEL)?.count).toBe(1);
  });

  it('CASE B: measured 60.98% → Balanced', () => {
    expect(measuredCapacityLabelFromPercent(60.98)).toBe('Balanced');
    const workload = testWorkload({
      level: 'normal',
      capacityLoadPercent: 60.98,
      capacityDataState: 'measured',
    });
    expect(capacityPresentationLabel(workload)).toBe('Balanced');
  });

  it('CASE C: measured 103.66% → Overloaded', () => {
    expect(measuredCapacityLabelFromPercent(103.66)).toBe('Overloaded');
    const workload = testWorkload({
      level: 'overloaded',
      capacityLoadPercent: 103.66,
      capacityDataState: 'measured',
    });
    expect(capacityPresentationLabel(workload)).toBe('Overloaded');
  });

  it('CASE D: all insufficient team → manager KPI must not say Balanced', () => {
    const rows: WorkloadRow[] = [
      {
        personId: 'a',
        activeWork: 1,
        atRisk: 0,
        workload: CAPACITY_INSUFFICIENT_LABEL,
        capacityDataState: 'insufficient_history',
        availability: 'Available',
      },
      {
        personId: 'b',
        activeWork: 2,
        atRisk: 0,
        workload: CAPACITY_INSUFFICIENT_LABEL,
        capacityDataState: 'insufficient_history',
        availability: 'Available',
      },
    ];
    const kpi = teamCapacityKpiFromRows(rows);
    expect(kpi.badgeLabel).toBe(CAPACITY_INSUFFICIENT_LABEL);
    expect(kpi.badgeLabel).not.toBe('Balanced');
    expect(kpi.value).toBe('—');
  });

  it('CASE F: distribution buckets sum to unique people', () => {
    const rows: WorkloadRow[] = [
      {
        personId: 'a',
        activeWork: 1,
        atRisk: 0,
        workload: 'Light',
        capacityDataState: 'measured',
        capacityLoadPercent: 40,
        availability: 'Available',
      },
      {
        personId: 'b',
        activeWork: 2,
        atRisk: 0,
        workload: CAPACITY_INSUFFICIENT_LABEL,
        capacityDataState: 'insufficient_history',
        availability: 'Available',
      },
      {
        personId: 'c',
        activeWork: 0,
        atRisk: 0,
        workload: 'Light',
        capacityDataState: 'insufficient_history',
        availability: 'Available',
      },
    ];
    const distribution = capacityDistribution(rows);
    const total = distribution.reduce((sum, bucket) => sum + bucket.count, 0);
    expect(total).toBe(rows.length);
    // Buckets follow each row's CURRENT workload label; capacityDataState does not move a person
    // out of Light. Only a row explicitly labelled as unrated (e.g. away) is "no history".
    expect(distribution.find((d) => d.label === 'Light')?.count).toBe(2);
    expect(distribution.find((d) => d.label === CAPACITY_INSUFFICIENT_LABEL)?.count).toBe(1);
  });

  it('CASE G: zero completed cycles never overrides the current workload level', () => {
    const workload = testWorkload({
      level: 'low',
      capacityDataState: 'measured',
      capacityLoadPercent: 12,
      capacityBreakdown: {
        completedCycleHours: 0,
        activeSegmentHours: 0,
        avgHoursPerCycle: 0,
        completedCyclesInPeriod: 0,
        daysInPeriod: 30,
        monthlyQuantity: 0,
        estimatedMonthlyHours: 0,
        capacityLoadPercent: 12,
        capacityDataState: 'insufficient_history',
      },
    });
    expect(capacityPresentationLabel(workload)).toBe('Light');
  });

  it('CASE E: mixed measurable + insufficient → neutral no-data count in distribution', () => {
    const rows: WorkloadRow[] = [
      {
        personId: 'a',
        activeWork: 1,
        atRisk: 0,
        workload: 'Heavy',
        capacityDataState: 'measured',
        capacityLoadPercent: 90,
        availability: 'Available',
      },
      {
        personId: 'b',
        activeWork: 2,
        atRisk: 0,
        workload: CAPACITY_INSUFFICIENT_LABEL,
        capacityDataState: 'insufficient_history',
        availability: 'Available',
      },
    ];
    const distribution = capacityDistribution(rows);
    expect(distribution.find((d) => d.label === 'Heavy')?.count).toBe(1);
    expect(distribution.find((d) => d.label === CAPACITY_INSUFFICIENT_LABEL)?.count).toBe(1);

    const kpi = teamCapacityKpiFromRows(rows);
    expect(kpi.value).toBe('1');
    expect(kpi.tooltip).toMatch(/away or unrated/);
  });
});

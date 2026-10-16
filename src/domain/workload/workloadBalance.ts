import type { Person } from '../people/types';
import type { TeamSnapshot } from '../people/types';
import type { WorkloadLevel } from './workloadEngine';
import { currentWorkloadForPerson } from '../people/personDisplay';
import {
  aggregateCurrentEffort,
  currentWorkloadPercent,
  personalCurrentEffort,
} from './hierarchicalWorkload';

export interface WorkloadBalanceRow {
  personId: string;
  personName: string;
  personRouteKey: string;
  level: WorkloadLevel;
  /** Current workload %: expected effort / available hours in the 10-working-day horizon. */
  currentLoadPercent: number | null;
  expectedEffortHours: number | null;
  availableHoursInHorizon: number | null;
  /** Operational context only — never used for ordering or evaluation. */
  activeCount: number;
  atRiskCount: number;
  problematicCount: number;
}

export interface WorkloadBalanceInsight {
  type: 'highest_workload' | 'imbalance';
  message: string;
}

export interface WorkloadBalanceSummary {
  rows: WorkloadBalanceRow[];
  insights: WorkloadBalanceInsight[];
  /** Team Current workload: Σ expected effort / Σ available hours (never averaged person %). */
  teamCurrentLoadPercent: number | null;
}

/** Highest Current workload first; missing workload last; ties by expected effort, then name. */
export function compareWorkloadBalanceRows(a: WorkloadBalanceRow, b: WorkloadBalanceRow): number {
  const aPct = a.currentLoadPercent;
  const bPct = b.currentLoadPercent;
  if (aPct === null && bPct !== null) return 1;
  if (aPct !== null && bPct === null) return -1;
  if (aPct !== null && bPct !== null && aPct !== bPct) return bPct - aPct;
  const aHours = a.expectedEffortHours ?? 0;
  const bHours = b.expectedEffortHours ?? 0;
  if (aHours !== bHours) return bHours - aHours;
  return a.personName.localeCompare(b.personName);
}

export function buildWorkloadBalance(
  snapshot: TeamSnapshot,
  routeKeyFor: (person: Person) => string,
  counts: {
    active: (person: Person) => number;
    atRisk: (person: Person) => number;
    problematic: (person: Person) => number;
  },
): WorkloadBalanceSummary {
  const rows: WorkloadBalanceRow[] = snapshot.persons
    .map((person) => {
      const effort = personalCurrentEffort(person);
      const workload = currentWorkloadForPerson(person);
      return {
        personId: person.id,
        personName: person.bamboo.displayName,
        personRouteKey: routeKeyFor(person),
        level: workload?.level || 'normal',
        currentLoadPercent: currentWorkloadPercent(effort),
        expectedEffortHours: effort ? effort.expectedEffortHours : null,
        availableHoursInHorizon: effort ? effort.availableHoursInHorizon : null,
        activeCount: counts.active(person),
        atRiskCount: counts.atRisk(person),
        problematicCount: counts.problematic(person),
      };
    })
    .sort(compareWorkloadBalanceRows);

  const personById = new Map(snapshot.persons.map((person) => [person.id, person]));
  const teamEffort = aggregateCurrentEffort(
    snapshot.persons.map((person) => person.id),
    (id) => personalCurrentEffort(personById.get(id)),
  );

  const insights: WorkloadBalanceInsight[] = [];
  const highest = rows[0];
  if (highest && highest.currentLoadPercent !== null) {
    insights.push({
      type: 'highest_workload',
      message: `${highest.personName} has the highest current workload in the team (${Math.round(highest.currentLoadPercent)}%).`,
    });
  }

  const elevated = rows.filter((r) => r.level === 'overloaded' || r.level === 'high').length;
  const light = rows.filter((r) => r.level === 'low').length;
  if (elevated >= 2 && light >= 2) {
    insights.push({
      type: 'imbalance',
      message: `Potential workload imbalance: ${elevated} people are Heavy/Overloaded while ${light} are Light.`,
    });
  }

  return { rows, insights, teamCurrentLoadPercent: currentWorkloadPercent(teamEffort) };
}

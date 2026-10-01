import type { Person } from '../people/types';
import type { TeamSnapshot } from '../people/types';
import type { WorkloadLevel } from './workloadEngine';

export interface WorkloadBalanceRow {
  personId: string;
  personName: string;
  personRouteKey: string;
  level: WorkloadLevel;
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
    .map((person) => ({
      personId: person.id,
      personName: person.bamboo.displayName,
      personRouteKey: routeKeyFor(person),
      level: person.workload?.level || 'normal',
      activeCount: counts.active(person),
      atRiskCount: counts.atRisk(person),
      problematicCount: counts.problematic(person),
    }))
    .sort((a, b) => b.activeCount - a.activeCount);

  const insights: WorkloadBalanceInsight[] = [];
  if (rows.length) {
    const highest = rows[0];
    insights.push({
      type: 'highest_workload',
      message: `${highest.personName} has the highest active workload in the team.`,
    });
  }

  const overloaded = rows.filter((r) => r.level === 'overloaded' || r.level === 'high').length;
  const low = rows.filter((r) => r.level === 'low').length;
  if (overloaded >= 2 && low >= 2) {
    insights.push({
      type: 'imbalance',
      message: `Potential workload imbalance: ${overloaded} people are High/Overloaded while ${low} are Low.`,
    });
  }

  return { rows, insights };
}

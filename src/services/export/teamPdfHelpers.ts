import type { Person } from '../../domain/people/types';
import { firstPassPercent } from '../../domain/people/personDisplay';
import { buildOrgGraph, employeeHasDirectReports } from '../../domain/organization/orgGraph';
import { teamNameForPerson } from '../../domain/organization/teamGrouping';
import type { ReportParams } from '../../domain/jira/types';
import type { DeliveryRiskItem } from '../../domain/radar/types';

export function resolveTeamDisplayNameFromPersons(persons: Person[]): string {
  if (!persons.length) return 'Team';
  const counts = new Map<string, number>();
  for (const person of persons) {
    const name = teamNameForPerson(person);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = teamNameForPerson(persons[0]);
  let max = 0;
  for (const [name, count] of counts) {
    if (count > max) {
      max = count;
      best = name;
    }
  }
  return best;
}

/** Individual contributors only — anyone with direct reports in the org graph is excluded. */
export function filterIndividualContributorPersons(persons: Person[]): Person[] {
  const graph = buildOrgGraph(persons.map((person) => person.bamboo));
  return persons.filter((person) => !employeeHasDirectReports(person.id, graph));
}

export function buildCanonicalPersonPeriodKpis(person: Person) {
  return {
    efficiency: person.performance ? `${person.performance.efficiencyIndex}%` : '—',
    firstPass: `${firstPassPercent(person)}%`,
    completed: person.performance ? String(person.performance.completedCount) : '0',
    backflows: person.performance ? String(person.performance.backflowCount) : '0',
  };
}

export function deliveryRiskCountByPersonId(
  deliveryRisk: DeliveryRiskItem[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of deliveryRisk) {
    if (!row.personId) continue;
    map.set(row.personId, (map.get(row.personId) ?? 0) + 1);
  }
  return map;
}

export function workloadBalanceSubtitle(
  rows: { personName: string; active: number }[],
): string | undefined {
  if (!rows.length) return undefined;
  const highest = rows.reduce((best, row) => (row.active > best.active ? row : best), rows[0]);
  if (highest.active <= 0) {
    return 'No measured active work items for the team right now.';
  }
  return `${highest.personName} has the highest active workload (${highest.active}).`;
}

/** Parity helper: same period KPI fields as Performance person detail / People views. */
export function personPeriodKpisMatchPerformance(
  person: Person,
  _params: ReportParams,
): ReturnType<typeof buildCanonicalPersonPeriodKpis> {
  return buildCanonicalPersonPeriodKpis(person);
}

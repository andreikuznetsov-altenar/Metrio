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

function personManagesSomeoneInRoster(person: Person, roster: Person[]): boolean {
  const employeeId = person.bamboo.id?.trim() || person.id;
  return roster.some((other) => {
    if (other.id === person.id) return false;
    const supervisorId = other.bamboo.supervisorId?.trim();
    if (!supervisorId) return false;
    return (
      supervisorId === employeeId ||
      supervisorId === person.id ||
      supervisorId === person.bamboo.id
    );
  });
}

/** Individual contributors only — leads/managers with direct reports are excluded. */
export function filterIndividualContributorPersons(persons: Person[]): Person[] {
  const graph = buildOrgGraph(persons.map((person) => person.bamboo));
  return persons.filter((person) => {
    const employeeId = person.bamboo.id?.trim() || person.id;
    if (employeeHasDirectReports(employeeId, graph)) {
      return false;
    }
    if (personManagesSomeoneInRoster(person, persons)) {
      return false;
    }
    return true;
  });
}

export function buildCanonicalPersonPeriodKpis(person: Person) {
  return {
    throughput: person.performance ? String(person.performance.throughputCount ?? person.performance.completedCount) : '—',
    firstPass: `${firstPassPercent(person)}%`,
    completed: person.performance ? String(person.performance.completedCount) : '0',
    backflows: person.performance ? String(person.performance.backflowEventCount) : '0',
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

export type PdfWorkloadTone = 'danger' | 'warning' | 'success' | 'neutral';

export function pdfWorkloadTone(workloadLabel: string): PdfWorkloadTone {
  const normalized = workloadLabel.toLowerCase();
  if (normalized.includes('overload')) return 'danger';
  if (normalized.includes('heavy') || normalized.includes('high')) return 'warning';
  if (normalized.includes('light') || normalized.includes('low')) return 'success';
  return 'neutral';
}

export function workloadBalanceSubtitle(
  rows: { personName: string; currentLoadPercent?: number | null }[],
): string | undefined {
  if (!rows.length) return undefined;
  const rated = rows.filter(
    (row): row is { personName: string; currentLoadPercent: number } =>
      typeof row.currentLoadPercent === 'number',
  );
  if (!rated.length) {
    return 'Current workload is unavailable for the team right now.';
  }
  const highest = rated.reduce((best, row) =>
    row.currentLoadPercent > best.currentLoadPercent ? row : best,
  );
  if (highest.currentLoadPercent <= 0) {
    return 'No expected effort in the next 10 working days for the team.';
  }
  return `${highest.personName} has the highest current workload (${Math.round(highest.currentLoadPercent)}%).`;
}

/** Parity helper: same period KPI fields as Performance person detail / People views. */
export function personPeriodKpisMatchPerformance(
  person: Person,
  _params: ReportParams,
): ReturnType<typeof buildCanonicalPersonPeriodKpis> {
  return buildCanonicalPersonPeriodKpis(person);
}

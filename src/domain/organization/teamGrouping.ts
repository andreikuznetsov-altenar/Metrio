import type { Person } from "../people/types";

export interface TeamGroup {
  teamId: string;
  teamName: string;
  persons: Person[];
}

export function teamKeyForPerson(person: Person): string {
  const department = person.bamboo.department?.trim();
  if (department) {
    return slugify(department);
  }
  const title = person.bamboo.jobTitle?.trim();
  if (title) {
    return slugify(title.split(/\s+/)[0] ?? "team");
  }
  return "team-general";
}

export function teamNameForPerson(person: Person): string {
  return person.bamboo.department?.trim() || person.bamboo.jobTitle?.trim() || "General";
}

export function groupPersonsByTeam(persons: Person[]): TeamGroup[] {
  const map = new Map<string, TeamGroup>();
  for (const person of persons) {
    const teamId = teamKeyForPerson(person);
    const teamName = teamNameForPerson(person);
    const existing = map.get(teamId);
    if (existing) {
      existing.persons.push(person);
    } else {
      map.set(teamId, { teamId, teamName, persons: [person] });
    }
  }
  return [...map.values()].sort((a, b) => a.teamName.localeCompare(b.teamName));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

import type { Person } from "../domain/types";

export const PEOPLE: Record<string, Person> = {
  "person-alex": { id: "person-alex", name: "Alex Morgan", role: "employee" },
  "person-sam": { id: "person-sam", name: "Sam Rivera", role: "lead" },
  "person-jordan": {
    id: "person-jordan",
    name: "Jordan Lee",
    role: "director",
  },
  "person-01": { id: "person-01", name: "Mia Chen", role: "employee" },
  "person-02": { id: "person-02", name: "Noah Patel", role: "employee" },
  "person-03": { id: "person-03", name: "Ella Brooks", role: "employee" },
  "person-04": { id: "person-04", name: "Leo Nguyen", role: "employee" },
  "person-05": { id: "person-05", name: "Ava Singh", role: "employee" },
  "person-06": { id: "person-06", name: "Chris Ortiz", role: "lead" },
  "person-07": { id: "person-07", name: "Taylor Kim", role: "employee" },
  "person-08": { id: "person-08", name: "Riley Fox", role: "lead" },
  "person-09": { id: "person-09", name: "Jamie Wu", role: "employee" },
};

export function getPerson(id: string): Person {
  const person = PEOPLE[id];
  if (!person) {
    throw new Error(`Unknown person id: ${id}`);
  }
  return person;
}

export function getDirectReports(team: { directReportIds: string[] }): Person[] {
  return team.directReportIds.map(getPerson);
}

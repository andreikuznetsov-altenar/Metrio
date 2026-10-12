import type { Person } from "./types";

export interface PersonDirectoryEntry {
  personId: string;
  bambooEmployeeId: string;
  displayName: string;
}

const byPersonId = new Map<string, PersonDirectoryEntry>();
const byBambooEmployeeId = new Map<string, PersonDirectoryEntry>();

function registerEntry(entry: PersonDirectoryEntry): void {
  byPersonId.set(entry.personId, entry);
  byBambooEmployeeId.set(entry.bambooEmployeeId, entry);
}

export function registerPersonDirectory(persons: Person[]): void {
  for (const person of persons) {
    const bambooEmployeeId = person.bamboo?.id?.trim();
    if (!bambooEmployeeId) continue;
    registerEntry({
      personId: person.id,
      bambooEmployeeId,
      displayName: person.bamboo.displayName,
    });
  }
}

export function registerBambooPersonDirectory(
  employees: Array<{ id?: string | null; displayName?: string | null }>,
): void {
  for (const employee of employees) {
    const bambooEmployeeId = employee.id?.trim();
    const displayName = employee.displayName?.trim();
    if (!bambooEmployeeId || !displayName) continue;
    registerEntry({
      personId: bambooEmployeeId,
      bambooEmployeeId,
      displayName,
    });
  }
}

export function lookupPersonDirectory(personId: string): PersonDirectoryEntry | undefined {
  return byPersonId.get(personId);
}

export function lookupBambooPersonDirectory(
  bambooEmployeeId: string,
): PersonDirectoryEntry | undefined {
  return byBambooEmployeeId.get(bambooEmployeeId);
}

export function clearPersonDirectory(): void {
  byPersonId.clear();
  byBambooEmployeeId.clear();
}

export function resolvePersonAvatarIdentity(input: {
  person?: Person | null;
  personId?: string;
  displayName?: string;
  bambooEmployeeId?: string;
}): { bambooEmployeeId: string | null; displayName: string } {
  const explicit = input.bambooEmployeeId?.trim();
  if (explicit) {
    return {
      bambooEmployeeId: explicit,
      displayName: input.displayName?.trim() || "?",
    };
  }

  if (input.person) {
    const bambooEmployeeId = input.person.bamboo?.id?.trim() || null;
    return {
      bambooEmployeeId,
      displayName:
        input.person.bamboo?.displayName?.trim() ||
        input.displayName?.trim() ||
        "?",
    };
  }

  const personId = input.personId?.trim();
  if (personId) {
    const entry = byPersonId.get(personId);
    if (entry) {
      return {
        bambooEmployeeId: entry.bambooEmployeeId,
        displayName: entry.displayName,
      };
    }
  }

  return {
    bambooEmployeeId: null,
    displayName: input.displayName?.trim() || "?",
  };
}

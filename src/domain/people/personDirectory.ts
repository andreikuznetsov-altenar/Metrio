import type { Person } from "./types";

export interface PersonDirectoryEntry {
  personId: string;
  bambooEmployeeId: string;
  displayName: string;
}

const byPersonId = new Map<string, PersonDirectoryEntry>();

export function registerPersonDirectory(persons: Person[]): void {
  for (const person of persons) {
    const bambooEmployeeId = person.bamboo?.id?.trim();
    if (!bambooEmployeeId) continue;
    byPersonId.set(person.id, {
      personId: person.id,
      bambooEmployeeId,
      displayName: person.bamboo.displayName,
    });
  }
}

export function lookupPersonDirectory(personId: string): PersonDirectoryEntry | undefined {
  return byPersonId.get(personId);
}

export function clearPersonDirectory(): void {
  byPersonId.clear();
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

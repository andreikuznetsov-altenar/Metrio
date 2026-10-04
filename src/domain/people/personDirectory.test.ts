import { describe, expect, it, beforeEach } from "vitest";
import type { Person } from "./types";
import {
  clearPersonDirectory,
  lookupPersonDirectory,
  registerPersonDirectory,
  resolvePersonAvatarIdentity,
} from "./personDirectory";

function person(id: string, bambooId: string, name: string): Person {
  return {
    id,
    bamboo: {
      id: bambooId,
      displayName: name,
      firstName: name,
      lastName: "",
      workEmail: `${id}@test`,
      jobTitle: "Designer",
      status: "Active",
    },
    jira: null,
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: null,
    performance: null,
    issues: [],
    ownedIssues: [],
  };
}

describe("personDirectory", () => {
  beforeEach(() => {
    clearPersonDirectory();
  });

  it("resolves bamboo id from registered personId", () => {
    registerPersonDirectory([person("metrio-1", "bamboo-99", "Alex")]);
    expect(lookupPersonDirectory("metrio-1")?.bambooEmployeeId).toBe("bamboo-99");
    const identity = resolvePersonAvatarIdentity({ personId: "metrio-1" });
    expect(identity.bambooEmployeeId).toBe("bamboo-99");
    expect(identity.displayName).toBe("Alex");
  });

  it("prefers explicit person.bamboo.id over directory", () => {
    registerPersonDirectory([person("metrio-1", "bamboo-99", "Alex")]);
    const identity = resolvePersonAvatarIdentity({
      person: person("metrio-1", "bamboo-42", "Alex"),
    });
    expect(identity.bambooEmployeeId).toBe("bamboo-42");
  });
});

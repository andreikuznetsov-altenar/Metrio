import { describe, expect, it } from "vitest";
import { dedupeIssueKeys, countUniqueDeliveryRiskForBranch } from "./leadershipBranches";
import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";

function person(id: string): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: "",
      workEmail: `${id}@t.com`,
      jobTitle: "",
      status: "active",
    },
    jira: null,
    identity: { matchedBy: "unresolved", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: null,
    performance: null,
    issues: [],
    ownedIssues: [],
  };
}

describe("leadershipBranches deduplication", () => {
  it("dedupes issue keys", () => {
    expect(dedupeIssueKeys(["UX-1", "UX-1", " UX-2 "])).toEqual(["UX-1", "UX-2"]);
  });

  it("counts unique delivery risk per branch", () => {
    const group = {
      branchId: "lead",
      leaderId: "lead",
      leaderName: "Lead",
      persons: [person("a"), person("b")],
    };
    const risk: DeliveryRiskItem[] = [
      {
        personId: "a",
        issueKey: "UX-1",
        severity: "warning",
        reason: "x",
        title: "t",
        status: "s",
        ageDays: 1,
      },
      {
        personId: "b",
        issueKey: "UX-1",
        severity: "warning",
        reason: "x",
        title: "t",
        status: "s",
        ageDays: 1,
      },
      {
        personId: "b",
        issueKey: "UX-2",
        severity: "warning",
        reason: "x",
        title: "t",
        status: "s",
        ageDays: 1,
      },
    ];
    expect(countUniqueDeliveryRiskForBranch(group, risk)).toBe(2);
  });
});

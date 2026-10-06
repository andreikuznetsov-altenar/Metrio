import { describe, expect, it } from "vitest";
import {
  aggregateLeadershipBranchMetrics,
  buildBranchCapacitySummary,
  buildLeadershipBranches,
} from "./leadershipBranchAggregation";
import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";

function person(id: string, level?: string): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: "",
      workEmail: `${id}@t.com`,
      jobTitle: "Designer",
    },
    availability: { state: "available", label: "Available" },
    workload: level
      ? {
          level,
          activeCount: 2,
          capacityDataState: "measured",
          capacityBreakdown: { completedCyclesInPeriod: 3, capacityDataState: "measured" },
        }
      : {
          activeCount: 1,
          capacityDataState: "insufficient_history",
          capacityBreakdown: { completedCyclesInPeriod: 0, capacityDataState: "insufficient_history" },
        },
  } as Person;
}

describe("leadershipBranchAggregation", () => {
  it("dedupes people and delivery-risk issue keys", () => {
    const persons = [person("a", "Heavy"), person("a", "Heavy"), person("b")];
    const deliveryRisk: DeliveryRiskItem[] = [
      {
        issueKey: "UX-1",
        personId: "a",
        severity: "warning",
        reason: "Review for 5 days",
      } as DeliveryRiskItem,
      {
        issueKey: "UX-1",
        personId: "a",
        severity: "critical",
        reason: "Review for 5 days",
      } as DeliveryRiskItem,
    ];
    const metrics = aggregateLeadershipBranchMetrics({
      descendantIds: ["a", "b"],
      persons,
      deliveryRisk,
    });
    expect(metrics.capacity.totalPeople).toBe(2);
    expect(metrics.uniqueDeliveryRiskCount).toBe(1);
    expect(metrics.longReviewCount).toBe(1);
    expect(metrics.capacity.insufficientHistoryPeople).toBe(1);
    expect(metrics.capacity.heavy + metrics.capacity.overloaded).toBeGreaterThanOrEqual(0);
  });

  it("builds branch list from top-level managers", () => {
    const branches = buildLeadershipBranches({
      branches: [{ managerId: "lead", descendantIds: ["lead", "e1"], totalPeople: 2 }],
      roster: [{ id: "lead", displayName: "Head UX", jobTitle: "Head" }],
      persons: [person("lead", "Balanced"), person("e1")],
      deliveryRisk: [],
      graph: new Map([
        ["lead", { id: "lead", directReportIds: ["e1"], supervisorId: "exec" }],
        ["e1", { id: "e1", directReportIds: [], supervisorId: "lead" }],
      ]),
    });
    expect(branches).toHaveLength(1);
    expect(branches[0].leaderName).toBe("Head UX");
    expect(branches[0].totalPeopleCount).toBe(2);
  });
});

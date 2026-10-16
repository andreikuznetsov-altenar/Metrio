import { describe, expect, it } from "vitest";
import {
  aggregateLeadershipBranchMetrics,
  buildBranchCapacitySummary,
  buildLeadershipBranches,
} from "./leadershipBranchAggregation";
import type { Person } from "../people/types";
import type { DeliveryRiskItem } from "../radar/types";

function person(id: string, level?: string): Person {
  const workloadLevel = level === "Heavy" ? "high" : level === "Overloaded" ? "overloaded" : level === "Light" ? "low" : "normal";
  const currentLoadPercent = workloadLevel === "high" ? 90 : workloadLevel === "overloaded" ? 110 : workloadLevel === "low" ? 25 : 60;
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
    workload: {
          level: workloadLevel,
          activeCount: 2,
          currentLoadPercent,
          expectedEffortHours: currentLoadPercent * 0.8,
          availableHoursInHorizon: 80,
          capacityDataState: "measured",
          capacityBreakdown: { completedCyclesInPeriod: 3, capacityDataState: "measured" },
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
        stageKind: "review",
        reasonCode: "stage_overdue",
        healthStatus: "problematic",
      } as DeliveryRiskItem,
      {
        issueKey: "UX-1",
        personId: "a",
        severity: "critical",
        reason: "Review for 5 days",
        stageKind: "review",
        reasonCode: "stage_overdue",
        healthStatus: "problematic",
      } as DeliveryRiskItem,
    ];
    const metrics = aggregateLeadershipBranchMetrics({
      descendantIds: ["a", "b"],
      persons,
      deliveryRisk,
      params: {
        dateFrom: "2024-01-01",
        dateTo: "2024-01-31",
        targetReviewDays: 3,
        users: [],
        projects: [],
      },
    });
    expect(metrics.capacity.totalPeople).toBe(2);
    expect(metrics.uniqueDeliveryRiskCount).toBe(1);
    expect(metrics.longReviewCount).toBe(1);
    expect(metrics.capacity.unratedPeople).toBe(0);
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
      params: {
        dateFrom: "2024-01-01",
        dateTo: "2024-01-31",
        targetReviewDays: 3,
        users: [],
        projects: [],
      },
    });
    expect(branches).toHaveLength(1);
    expect(branches[0].leaderName).toBe("Head UX");
    expect(branches[0].totalPeopleCount).toBe(2);
  });
});

describe("leadershipBranchAggregation — raw numerators and denominators", () => {
  const withBreakdown = (id: string, exec: number, avail: number, expected: number, horizon: number): Person => {
    const base = person(id);
    return {
      ...base,
      workload: {
        ...base.workload!,
        currentLoadPercent: (expected / horizon) * 100,
        expectedEffortHours: expected,
        availableHoursInHorizon: horizon,
        capacityBreakdown: {
          executionHoursInPeriod: exec,
          availableHoursInPeriod: avail,
          capacityDataState: "measured",
          completedCyclesInPeriod: 3,
        },
      },
    } as Person;
  };
  const params = { dateFrom: "2026-01-01", dateTo: "2026-01-31", targetReviewDays: 3, users: [], projects: [] };

  it("Current workload is Σ expected / Σ available and Historical load is Σ hands-on / Σ available", () => {
    // Full-timer: 70h of 160h hist / 70h of 80h current. Part-timer: 8h of 16h hist / 2h of 8h current.
    const persons = [withBreakdown("ft", 70, 160, 70, 80), withBreakdown("pt", 8, 16, 2, 8)];
    const metrics = aggregateLeadershipBranchMetrics({ descendantIds: ["ft", "pt"], persons, deliveryRisk: [], params });
    expect(metrics.currentWorkload.expectedEffortHours).toBe(72);
    expect(metrics.currentWorkload.availableHoursInHorizon).toBe(88);
    expect(metrics.currentWorkload.percent).toBeCloseTo((72 / 88) * 100, 1); // mean of % would be 56.3
    expect(metrics.historicalLoad.executionHoursInPeriod).toBe(78);
    expect(metrics.historicalLoad.availableHoursInPeriod).toBe(176);
    expect(metrics.historicalLoad.percent).toBeCloseTo((78 / 176) * 100, 1); // mean of % would be 46.9
  });

  it("people without completed history still contribute to Current workload", () => {
    const noHistory = withBreakdown("n", 0, 0, 40, 80);
    const metrics = aggregateLeadershipBranchMetrics({ descendantIds: ["n"], persons: [noHistory], deliveryRisk: [], params });
    expect(metrics.currentWorkload.percent).toBe(50);
    expect(metrics.currentWorkload.label).not.toBe("No current workload");
    expect(metrics.historicalLoad.percent).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { buildManagerDashboardKpis, buildEmployeeDashboardKpis } from "./buildDashboardKpis";
import { testWorkload } from "../testFixtures";

describe("buildManagerDashboardKpis", () => {
  it("maps team health and delivery KPIs", () => {
    const cards = buildManagerDashboardKpis({
      scopeHealth: {
        severity: "watch",
        line: "2 delivery risks · 1 overloaded",
        tooltip: "Team health",
      },
      firstPassRate: "88%",
      deliveryRiskCount: 2,
      teamWorkload: [
        { personId: "a", personName: "A", active: 1, atRisk: 0, workload: "Overloaded" },
      ],
    });
    expect(cards.map((c) => c.label)).toEqual([
      "Team health",
      "First pass",
      "Delivery risk",
      "Capacity",
    ]);
    expect(cards[1].value).toBe("88%");
    expect(cards[2].value).toBe("2");
  });
});

describe("buildEmployeeDashboardKpis", () => {
  it("includes capacity load with tooltip context", () => {
    const cards = buildEmployeeDashboardKpis({
      metrics: [
        { label: "Efficiency", value: "82%" },
        { label: "First pass", value: "90%" },
        { label: "Completed", value: "12" },
      ],
      workload: testWorkload({
        level: "high",
        capacityLoadPercent: 92,
        activeWorkCount: 4,
        currentAssignedIssueCount: 6,
      }),
    });
    expect(cards).toHaveLength(4);
    expect(cards[3].label).toBe("Capacity load");
    expect(cards[3].tooltip).toMatch(/4 active work · 6 assigned/);
  });
});

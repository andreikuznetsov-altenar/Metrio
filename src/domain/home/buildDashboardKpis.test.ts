import { describe, expect, it } from "vitest";
import {
  buildManagerDashboardKpis,
  buildEmployeeDashboardKpis,
} from "./buildDashboardKpis";
import { buildManagerExecutiveModel } from "./executiveDashboardModel";
import { performanceHelp } from "../performance/performanceHelp";
import { testWorkload } from "../testFixtures";

describe("buildManagerDashboardKpis", () => {
  it("maps TEAM HEALTH from canonical Efficiency, not deliveryRiskCount", () => {
    const cards = buildManagerDashboardKpis({
      teamEfficiency: {
        value: "91%",
        status: "Healthy",
        statusVariant: "success",
      },
      firstPassRate: "88%",
      deliveryRiskCount: 44,
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

    const teamHealth = cards[0];
    expect(teamHealth.id).toBe("team-health");
    expect(teamHealth.value).toBe("91%");
    expect(teamHealth.badge).toEqual({ label: "Healthy", variant: "success" });
    expect(teamHealth.tooltip).toBe(performanceHelp.efficiency);
    expect(teamHealth.value).not.toMatch(/delivery risk/i);
    expect(teamHealth.tooltip).not.toMatch(/delivery risk/i);

    const deliveryRisk = cards[2];
    expect(deliveryRisk.value).toBe("44");
    expect(cards[1].value).toBe("88%");
  });

  it("derives efficiency badge from score when status is omitted", () => {
    const cards = buildManagerDashboardKpis({
      teamEfficiency: { value: "91%" },
      firstPassRate: "84%",
      deliveryRiskCount: 0,
      teamWorkload: [],
    });
    expect(cards[0].value).toBe("91%");
    expect(cards[0].badge?.label).toBe("Healthy");
    expect(cards[0].badge?.variant).toBe("success");
  });

  it("keeps Delivery risk card on deliveryRiskCount while TEAM HEALTH ignores it", () => {
    const withRisks = buildManagerDashboardKpis({
      teamEfficiency: { value: "91%", status: "Healthy", statusVariant: "success" },
      firstPassRate: "84%",
      deliveryRiskCount: 44,
      teamWorkload: [],
    });
    const withoutRisks = buildManagerDashboardKpis({
      teamEfficiency: { value: "91%", status: "Healthy", statusVariant: "success" },
      firstPassRate: "84%",
      deliveryRiskCount: 0,
      teamWorkload: [],
    });
    expect(withRisks[0].value).toBe(withoutRisks[0].value);
    expect(withRisks[0].badge).toEqual(withoutRisks[0].badge);
    expect(withRisks[2].value).toBe("44");
    expect(withoutRisks[2].value).toBe("0");
  });
});

describe("buildManagerExecutiveModel TEAM HEALTH wiring", () => {
  const base = {
    performanceSnapshot: {
      metrics: [
        { label: "Efficiency", value: "70%" },
        { label: "First pass", value: "80%" },
      ],
    },
    focus: [] as never[],
    teamActions: [] as never[],
    deliverySummary: { longReview: 0, problematic: 0, backflowSignals: 0 },
    trends: [] as never[],
  };

  it("uses teamSnapshot Efficiency for TEAM HEALTH across period-like summary changes", () => {
    const threeMonths = buildManagerExecutiveModel({
      ...base,
      teamSnapshot: {
        summary: [
          { label: "Efficiency", value: "91%", status: "Healthy", statusVariant: "success" },
          { label: "First pass", value: "84%" },
        ],
        workload: [],
      },
      deliveryRiskCount: 44,
    });
    const sevenDays = buildManagerExecutiveModel({
      ...base,
      teamSnapshot: {
        summary: [
          { label: "Efficiency", value: "86%", status: "Healthy", statusVariant: "success" },
          { label: "First pass", value: "90%" },
        ],
        workload: [],
      },
      deliveryRiskCount: 44,
    });

    const health3m = threeMonths.kpis.find((c) => c.id === "team-health")!;
    const health7d = sevenDays.kpis.find((c) => c.id === "team-health")!;
    expect(health3m.value).toBe("91%");
    expect(health7d.value).toBe("86%");
    expect(health3m.value).not.toBe("44");
    expect(threeMonths.kpis.find((c) => c.id === "delivery-risk")?.value).toBe("44");
    expect(sevenDays.kpis.find((c) => c.id === "delivery-risk")?.value).toBe("44");
    // Scope banner may still mention delivery risks — KPI card must not.
    expect(threeMonths.scopeHealth.line).toMatch(/delivery risk/i);
    expect(health3m.value).not.toMatch(/delivery risk/i);
    expect(health3m.tooltip).toBe(performanceHelp.efficiency);
  });

  it("E/F. Dashboard TEAM HEALTH tracks period Efficiency the same as Performance summary", () => {
    const periods = [
      { efficiency: "91%", status: "Healthy" as const, firstPass: "84%" },
      { efficiency: "86%", status: "Healthy" as const, firstPass: "90%" },
      { efficiency: "72%", status: "Watch" as const, firstPass: "70%" },
    ];
    for (const period of periods) {
      // Canonical Performance Efficiency card for the period/filters.
      const performanceEfficiency = {
        label: "Efficiency",
        value: period.efficiency,
        status: period.status,
        statusVariant:
          period.status === "Watch" ? ("warning" as const) : ("success" as const),
      };
      const model = buildManagerExecutiveModel({
        ...base,
        teamSnapshot: {
          summary: [performanceEfficiency, { label: "First pass", value: period.firstPass }],
          workload: [],
        },
        deliveryRiskCount: 44,
      });
      const teamHealth = model.kpis.find((c) => c.id === "team-health")!;
      expect(teamHealth.value).toBe(performanceEfficiency.value);
      expect(teamHealth.badge?.label).toBe(performanceEfficiency.status);
      expect(teamHealth.value).not.toMatch(/delivery risk/i);
      expect(model.scopeHealth.line).toMatch(/44 delivery risks/i);
    }
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
    expect(cards[3].tooltip).toMatch(/6 assigned · 4 active/);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildManagerDashboardKpis,
  buildEmployeeDashboardKpis,
} from "./buildDashboardKpis";
import { buildManagerExecutiveModel } from "./executiveDashboardModel";
import { testWorkload } from "../testFixtures";

describe("buildManagerDashboardKpis", () => {
  it("shows canonical Throughput independently from deliveryRiskCount", () => {
    const cards = buildManagerDashboardKpis({
      teamThroughput: {
        value: "31",
      },
      firstPassRate: "88%",
      deliveryRiskCount: 44,
      teamWorkload: [
        { personId: "a", personName: "A", active: 1, atRisk: 0, workload: "Overloaded" },
      ],
    });
    expect(cards.map((c) => c.label)).toEqual([
      "Throughput",
      "First Pass",
      "Delivery risk",
      "Heavy / Overloaded",
    ]);

    const throughput = cards[0];
    expect(throughput.id).toBe("throughput");
    expect(throughput.value).toBe("31");
    expect(throughput.badge).toBeUndefined();
    expect(throughput.tooltip).toMatch(/completion cycles/i);

    const deliveryRisk = cards[2];
    expect(deliveryRisk.value).toBe("44");
    expect(cards[1].value).toBe("88%");
  });

  it("does not infer a health badge from throughput", () => {
    const cards = buildManagerDashboardKpis({
      teamThroughput: { value: "31" },
      firstPassRate: "84%",
      deliveryRiskCount: 0,
      teamWorkload: [],
    });
    expect(cards[0].value).toBe("31");
    expect(cards[0].badge).toBeUndefined();
  });

  it("keeps Delivery risk card on deliveryRiskCount while TEAM HEALTH ignores it", () => {
    const withRisks = buildManagerDashboardKpis({
      teamThroughput: { value: "31" },
      firstPassRate: "84%",
      deliveryRiskCount: 44,
      teamWorkload: [],
    });
    const withoutRisks = buildManagerDashboardKpis({
      teamThroughput: { value: "31" },
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
        { label: "Throughput", value: "30" },
        { label: "First Pass", value: "80%" },
      ],
    },
    focus: [] as never[],
    teamActions: [] as never[],
    deliverySummary: { longReview: 0, problematic: 0, backflowSignals: 0 },
    trends: [] as never[],
  };

  it("uses teamSnapshot Throughput across period-like summary changes", () => {
    const threeMonths = buildManagerExecutiveModel({
      ...base,
      teamSnapshot: {
        summary: [
          { label: "Throughput", value: "31" },
          { label: "First Pass", value: "84%" },
        ],
        workload: [],
      },
      deliveryRiskCount: 44,
    });
    const sevenDays = buildManagerExecutiveModel({
      ...base,
      teamSnapshot: {
        summary: [
          { label: "Throughput", value: "12" },
          { label: "First Pass", value: "90%" },
        ],
        workload: [],
      },
      deliveryRiskCount: 44,
    });

    const health3m = threeMonths.kpis.find((c) => c.id === "throughput")!;
    const health7d = sevenDays.kpis.find((c) => c.id === "throughput")!;
    expect(health3m.value).toBe("31");
    expect(health7d.value).toBe("12");
    expect(health3m.value).not.toBe("44");
    expect(threeMonths.kpis.find((c) => c.id === "delivery-risk")?.value).toBe("44");
    expect(sevenDays.kpis.find((c) => c.id === "delivery-risk")?.value).toBe("44");
    // Scope banner may still mention delivery risks — KPI card must not.
    expect(threeMonths.scopeHealth.line).toMatch(/delivery risk/i);
    expect(health3m.value).not.toMatch(/delivery risk/i);
    expect(health3m.tooltip).toMatch(/completion cycles/i);
  });

  it("Dashboard Throughput tracks the Performance summary", () => {
    const periods = [
      { throughput: "31", firstPass: "84%" },
      { throughput: "12", firstPass: "90%" },
      { throughput: "4", firstPass: "70%" },
    ];
    for (const period of periods) {
      // Canonical Performance Throughput card for the period/filters.
      const performanceThroughput = {
        label: "Throughput",
        value: period.throughput,
      };
      const model = buildManagerExecutiveModel({
        ...base,
        teamSnapshot: {
          summary: [performanceThroughput, { label: "First Pass", value: period.firstPass }],
          workload: [],
        },
        deliveryRiskCount: 44,
      });
      const teamHealth = model.kpis.find((c) => c.id === "throughput")!;
      expect(teamHealth.value).toBe(performanceThroughput.value);
      expect(teamHealth.badge).toBeUndefined();
      expect(teamHealth.value).not.toMatch(/delivery risk/i);
      expect(model.scopeHealth.line).toMatch(/44 delivery risks/i);
    }
  });
});

describe("buildEmployeeDashboardKpis", () => {
  it("includes Current workload with tooltip context", () => {
    const cards = buildEmployeeDashboardKpis({
      metrics: [
        { label: "Throughput", value: "12" },
        { label: "First Pass", value: "90%" },
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
    expect(cards[3].label).toBe("Current workload");
    expect(cards[3].tooltip).toMatch(/6 assigned · 4 active/);
  });
});

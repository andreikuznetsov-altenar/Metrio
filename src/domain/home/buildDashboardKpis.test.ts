import { describe, expect, it } from "vitest";
import { buildManagerDashboardKpis } from "./buildDashboardKpis";

describe("buildManagerDashboardKpis", () => {
  it("maps existing delivery and workload counts", () => {
    const cards = buildManagerDashboardKpis({
      deliveryRiskCount: 3,
      deliverySummary: { problematic: 1, longReview: 10, backflowSignals: 2 },
      teamSnapshot: {
        directReportIds: [],
        summary: [],
        attention: [],
        attentionTotalCount: 0,
        trends: [],
        workload: [
          { personId: "a", personName: "A", active: 1, atRisk: 0, workload: "High" },
        ],
        timeOff: [],
        personDetails: {},
      },
      awayNextWeek: 2,
    });
    expect(cards.map((c) => c.label)).toEqual([
      "Delivery risk",
      "Long Review",
      "Overloaded people",
      "Upcoming leave",
    ]);
    expect(cards[0].value).toBe("3");
    expect(cards[1].value).toBe("10");
    expect(cards[2].value).toBe("1");
    expect(cards[3].value).toBe("2");
  });
});

import { describe, expect, it } from "vitest";
import { buildProductRecommendations } from "./buildProductRecommendations";

describe("buildProductRecommendations", () => {
  it("limits dashboard manager recommendations to three items", () => {
    const items = buildProductRecommendations({
      role: "manager",
      deliverySummary: {
        problematic: 2,
        longReview: 10,
        backflowSignals: 1,
      },
      deliveryRiskCount: 18,
      teamWorkload: [
        {
          personId: "a",
          activeWork: 1,
          atRisk: 0,
          workload: "Heavy",
          capacityDataState: "measured",
          availability: "Available",
        },
      ],
      teamActions: [],
      focus: [],
      attentionItems: [],
      awayNextWeek: 2,
      maxItems: 3,
    });
    expect(items.length).toBeLessThanOrEqual(3);
    expect(items[0]?.actionLabel).toBeTruthy();
  });

  it("hides employee manager-only capacity guidance", () => {
    const items = buildProductRecommendations({
      role: "employee",
      deliverySummary: { problematic: 0, longReview: 0, backflowSignals: 0 },
      deliveryRiskCount: 0,
      teamWorkload: [
        {
          personId: "a",
          activeWork: 1,
          atRisk: 0,
          workload: "Overloaded",
          capacityDataState: "measured",
          availability: "Available",
        },
      ],
      teamActions: [],
      focus: [],
      attentionItems: [],
      maxItems: 3,
    });
    expect(items.every((item) => !item.title.includes("team member"))).toBe(true);
  });
});

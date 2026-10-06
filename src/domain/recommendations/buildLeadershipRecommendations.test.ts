import { describe, expect, it } from "vitest";
import { buildLeadershipRecommendations } from "./buildLeadershipRecommendations";
import type { LeadershipBranch } from "../organization/leadershipBranchTypes";

function branch(partial: Partial<LeadershipBranch> & { leaderId: string; leaderName: string }): LeadershipBranch {
  return {
    memberIds: [],
    descendantIds: [],
    directReportCount: 1,
    totalPeopleCount: 5,
    metrics: {
      activeWorkCount: 10,
      uniqueDeliveryRiskCount: 0,
      longReviewCount: 0,
      problematicCount: 0,
      attentionCritical: 0,
      attentionWatch: 0,
      firstPassPercent: 80,
      completedCount: 20,
      backflowCount: 0,
      efficiencyIndex: 70,
      capacity: {
        totalPeople: 5,
        measuredPeople: 3,
        insufficientHistoryPeople: 2,
        light: 0,
        balanced: 1,
        heavy: 2,
        overloaded: 0,
      },
      awayNow: 0,
      awaySoon: 0,
    },
    ...partial,
  };
}

describe("buildLeadershipRecommendations", () => {
  it("mentions branch leader not individual employees", () => {
    const items = buildLeadershipRecommendations({
      maxItems: 3,
      branches: [
        branch({
          leaderId: "h1",
          leaderName: "Head UX",
          metrics: {
            ...branch({ leaderId: "h1", leaderName: "Head UX" }).metrics,
            longReviewCount: 6,
            uniqueDeliveryRiskCount: 8,
          },
        }),
      ],
    });
    expect(items[0]?.title).toContain("Head UX");
    expect(items[0]?.explanation).toMatch(/Head UX/);
    expect(items.length).toBeLessThanOrEqual(3);
  });
});

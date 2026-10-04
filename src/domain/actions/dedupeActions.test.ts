import { describe, expect, it } from "vitest";
import { aggregateStaleReviewActions } from "./dedupeActions";

describe("aggregateStaleReviewActions", () => {
  it("uses singular task when count is 1", () => {
    const action = aggregateStaleReviewActions([
      { issueKey: "UX-1", daysInReview: 8 },
    ]);
    expect(action?.title).toBe("1 task in Review for 7+ days");
  });

  it("uses plural tasks when count is greater than 1", () => {
    const action = aggregateStaleReviewActions([
      { issueKey: "UX-1", daysInReview: 8 },
      { issueKey: "UX-2", daysInReview: 9 },
    ]);
    expect(action?.title).toBe("2 tasks in Review for 7+ days");
  });
});

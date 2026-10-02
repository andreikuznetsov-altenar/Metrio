import { describe, expect, it } from "vitest";
import { groupAttentionSignals } from "./groupAttentionSignals";

describe("groupAttentionSignals", () => {
  it("groups identical reasons and counts tasks", () => {
    const grouped = groupAttentionSignals([
      {
        label: "No activity",
        variant: "danger",
        reason: "No activity for 7+ days",
        issueKey: "UX-1",
      },
      {
        label: "No activity",
        variant: "danger",
        reason: "No activity for 7+ days",
        issueKey: "UX-2",
      },
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].taskCount).toBe(2);
    expect(grouped[0].issueKeys).toEqual(["UX-1", "UX-2"]);
  });
});

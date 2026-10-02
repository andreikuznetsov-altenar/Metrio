import { describe, expect, it } from "vitest";
import { rebaseNotificationStateForOperationalRulesChange } from "./notificationRulesRebase";

describe("rebaseNotificationStateForOperationalRulesChange", () => {
  it("drops per-issue health keys but keeps person workload levels", () => {
    const next = rebaseNotificationStateForOperationalRulesChange({
      workloadLevels: {
        p1: "normal",
        "p1:UX-1": "problematic",
      },
      vacationNotified: {},
      problematicCounts: { p1: 2 },
    });
    expect(next.workloadLevels).toEqual({ p1: "normal" });
    expect(next.problematicCounts.p1).toBe(2);
  });
});

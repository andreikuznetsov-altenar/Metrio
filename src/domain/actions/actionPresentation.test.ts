import { describe, expect, it } from "vitest";
import { actionReasonTag, buildDashboardActionRow } from "./actionPresentation";
import type { ActionItem } from "./actionTypes";

describe("actionPresentation", () => {
  it("maps workload to Overloaded tag", () => {
    expect(actionReasonTag("workload")).toBe("Overloaded");
  });

  it("builds dashboard row with reason tag", () => {
    const item: ActionItem = {
      id: "a1",
      kind: "task_attention",
      severity: "warning",
      title: "UX-6124",
      description: "In Review · No activity 7+ days",
      target: { kind: "jira", issueKey: "UX-6124" },
    };
    const row = buildDashboardActionRow(item);
    expect(row.subject).toBe("UX-6124");
    expect(row.statusLabel).toBe("");
    expect(row.reasonTag).toBe("No activity");
    expect(row.contextLine).toContain("No activity");
  });
});

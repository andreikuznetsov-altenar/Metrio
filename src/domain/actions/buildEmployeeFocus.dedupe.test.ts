import { describe, expect, it } from "vitest";
import { buildEmployeeFocusActions } from "./buildEmployeeFocus";

describe("employee focus lists each Jira issue once", () => {
  it("an issue that is an attention signal AND a problematic work row is one focus item", () => {
    const workspace = {
      attention: [{ issueKey: "UX-401", reason: "In Progress for 190 weekdays", variant: "danger" }],
      problematicWork: [{ key: "UX-401", status: "In Progress", stageAge: "190 weekdays" }],
    } as never;
    const myWeek = { inReview: [{ key: "UX-401", status: "In Review", stageAge: "1 weekday" }] } as never;
    const items = buildEmployeeFocusActions({ workspace, myWeek, selfPersonId: "p1" });
    expect(items.filter((i) => i.issueKeys?.includes("UX-401"))).toHaveLength(1);
    expect(items[0]!.description).toContain("190 weekdays");
  });
});

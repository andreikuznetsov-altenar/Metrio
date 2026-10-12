import { describe, expect, it } from "vitest";
import { buildCurrentWorkJql, buildJql } from "./jql";

describe("Jira JQL builders", () => {
  it("keeps historical report filters scoped to configured projects", () => {
    const jql = buildJql({
      dateFrom: "2026-09-01",
      dateTo: "2026-10-12",
      targetReviewDays: 3,
      users: ["valeriia@example.com"],
      projects: ["UX"],
    });

    expect(jql).toContain('project in ("UX")');
    expect(jql).toContain('updated >= "2026-09-01"');
    expect(jql).toContain('updated <= "2026-10-12"');
  });

  it("discovers current work across projects without report project or date constraints", () => {
    const jql = buildCurrentWorkJql(["valeriia@example.com"]);

    expect(jql).toContain('assignee in ("valeriia@example.com")');
    expect(jql).toContain("statusCategory != Done");
    expect(jql).not.toContain("project in");
    expect(jql).not.toContain("updated >=");
    expect(jql).not.toContain("updated <=");
  });
});

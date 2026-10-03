import { describe, expect, it } from "vitest";
import {
  buildDashboardContextSummary,
  parseActiveJiraCount,
} from "./dashboardContextSummary";

describe("dashboardContextSummary", () => {
  it("explains active Jira tasks explicitly", () => {
    const summary = buildDashboardContextSummary({
      newJiraAssignmentCount: 0,
      activeJiraTaskCount: 2,
    });
    expect(summary).toContain("2 active Jira tasks");
    expect(summary).toContain("assigned to you");
  });

  it("mentions new assignments when present", () => {
    const summary = buildDashboardContextSummary({
      newJiraAssignmentCount: 1,
      activeJiraTaskCount: 3,
    });
    expect(summary).toContain("1 new Jira assignment");
  });

  it("parses active count from summary metric", () => {
    expect(parseActiveJiraCount("2")).toBe(2);
    expect(parseActiveJiraCount("x")).toBe(0);
  });
});

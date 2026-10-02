import { describe, expect, it } from "vitest";
import {
  markJiraAssignmentRead,
  unreadJiraAssignments,
  type JiraAssignmentState,
} from "./jiraAssignmentTracking";

describe("jira assignment counter consistency", () => {
  it("decrements unread count when assignments are marked read", () => {
    const state: JiraAssignmentState = {
      baselineComplete: true,
      knownAssignedIssueKeys: ["A-1", "A-2"],
      records: {
        "A-1": {
          issueKey: "A-1",
          title: "One",
          type: "jira_assignment",
          assignedAt: "2026-10-01T00:00:00.000Z",
        },
        "A-2": {
          issueKey: "A-2",
          title: "Two",
          type: "jira_assignment",
          assignedAt: "2026-10-01T00:00:00.000Z",
        },
      },
    };
    expect(unreadJiraAssignments(state)).toHaveLength(2);
    const afterFirst = markJiraAssignmentRead(
      state,
      "A-1",
      "2026-10-02T00:00:00.000Z",
    );
    expect(unreadJiraAssignments(afterFirst)).toHaveLength(1);
    const afterSecond = markJiraAssignmentRead(
      afterFirst,
      "A-2",
      "2026-10-02T00:00:00.000Z",
    );
    expect(unreadJiraAssignments(afterSecond)).toHaveLength(0);
  });
});

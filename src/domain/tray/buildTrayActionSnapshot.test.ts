import { describe, expect, it } from "vitest";
import { buildTrayActionSnapshot } from "./buildTrayActionSnapshot";

describe("buildTrayActionSnapshot", () => {
  it("omits tray title when zero unread", () => {
    const snapshot = buildTrayActionSnapshot({
      assignmentState: {
        baselineComplete: true,
        knownAssignedIssueKeys: ["UX-1"],
        records: {
          "UX-1": {
            issueKey: "UX-1",
            title: "Read",
            type: "jira_assignment",
            assignedAt: "2026-01-01",
            readAt: "2026-01-02",
          },
        },
      },
      activeTaskCount: 3,
      bambooActions: [],
    });
    expect(snapshot.trayTitle).toBeUndefined();
    expect(snapshot.unreadAssignmentCount).toBe(0);
  });

  it("shows numeric tray title for unread assignments", () => {
    const snapshot = buildTrayActionSnapshot({
      assignmentState: {
        baselineComplete: true,
        knownAssignedIssueKeys: ["UX-2"],
        records: {
          "UX-2": {
            issueKey: "UX-2",
            title: "New",
            type: "jira_assignment",
            assignedAt: "2026-01-01",
          },
        },
      },
      activeTaskCount: 14,
      bambooActions: [],
    });
    expect(snapshot.trayTitle).toBe("1");
    expect(snapshot.unreadAssignmentCount).toBe(1);
  });
});

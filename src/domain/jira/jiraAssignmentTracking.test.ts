import { describe, expect, it } from "vitest";
import {
  markJiraAssignmentRead,
  processJiraAssignmentSnapshot,
  unreadJiraAssignments,
} from "./jiraAssignmentTracking";
import type { AuditIssue } from "./types";

function issue(key: string): AuditIssue {
  return {
    issueKey: key,
    issueSummary: `Task ${key}`,
    currentStatus: "In Progress",
    currentAssigneeCanonical: "user-1",
    projectKey: "UX",
    transitions: [],
  } as AuditIssue;
}

describe("jiraAssignmentTracking", () => {
  it("bootstraps without creating events for existing assignments", () => {
    const ten = Array.from({ length: 10 }, (_, i) => issue(`UX-${i + 1}`));
    const first = processJiraAssignmentSnapshot(ten, {
      baselineComplete: false,
      knownAssignedIssueKeys: [],
      records: {},
    }, "2026-10-01T12:00:00.000Z");
    expect(first.newRecords).toHaveLength(0);
    expect(first.nextState.knownAssignedIssueKeys).toHaveLength(10);
    expect(unreadJiraAssignments(first.nextState)).toHaveLength(0);
  });

  it("creates one unread assignment when a new issue appears", () => {
    const boot = processJiraAssignmentSnapshot([issue("UX-1")], {
      baselineComplete: false,
      knownAssignedIssueKeys: [],
      records: {},
    }, "2026-10-01T12:00:00.000Z");
    const next = processJiraAssignmentSnapshot(
      [issue("UX-1"), issue("UX-2")],
      boot.nextState,
      "2026-10-02T12:00:00.000Z",
    );
    expect(next.newRecords).toHaveLength(1);
    expect(next.newRecords[0]?.issueKey).toBe("UX-2");
    expect(unreadJiraAssignments(next.nextState)).toHaveLength(1);
  });

  it("does not duplicate on unchanged refresh", () => {
    const boot = processJiraAssignmentSnapshot([issue("UX-1")], {
      baselineComplete: false,
      knownAssignedIssueKeys: [],
      records: {},
    }, "2026-10-01T12:00:00.000Z");
    const withNew = processJiraAssignmentSnapshot(
      [issue("UX-1"), issue("UX-2")],
      boot.nextState,
      "2026-10-02T12:00:00.000Z",
    );
    const again = processJiraAssignmentSnapshot(
      [issue("UX-1"), issue("UX-2")],
      withNew.nextState,
      "2026-10-02T12:30:00.000Z",
    );
    expect(again.newRecords).toHaveLength(0);
    expect(unreadJiraAssignments(again.nextState)).toHaveLength(1);
  });

  it("clears unread count when assignment is marked read", () => {
    const boot = processJiraAssignmentSnapshot([issue("UX-1")], {
      baselineComplete: false,
      knownAssignedIssueKeys: [],
      records: {},
    }, "2026-10-01T12:00:00.000Z");
    const withNew = processJiraAssignmentSnapshot(
      [issue("UX-1"), issue("UX-2")],
      boot.nextState,
      "2026-10-02T12:00:00.000Z",
    );
    const read = markJiraAssignmentRead(
      withNew.nextState,
      "UX-2",
      "2026-10-02T12:05:00.000Z",
    );
    expect(unreadJiraAssignments(read)).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import type { Person } from "../people/types";
import type { AuditIssue } from "../jira/types";
import { attentionPresentationSignalLabel, getActiveIssues } from "./taskSignals";
import { testWorkload } from "../testFixtures";

const params = {
  dateFrom: "2026-01-01",
  dateTo: "2026-03-01",
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function issue(key: string, status: string): AuditIssue {
  return {
    issueKey: key,
    issueSummary: "Task",
    issueCreated: "2026-01-01T00:00:00.000Z",
    assigneeName: "User",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    events: [],
    rangeEvents: [],
    currentStatus: status,
  };
}

function person(issues: AuditIssue[]): Person {
  return {
    id: "1",
    bamboo: {
      id: "1",
      displayName: "User",
      firstName: "User",
      lastName: "",
      workEmail: "u@co.com",
      jobTitle: "",
      status: "Active",
    },
    jira: {
      accountId: "1",
      displayName: "User",
      email: "u@co.com",
      canonicalKey: "1",
    },
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: testWorkload({ level: "normal", activeCount: 1 }),
    performance: null,
    issues,
  };
}

describe("getActiveIssues", () => {
  it("excludes cancelled tasks from active work", () => {
    const active = getActiveIssues(
      person([
        issue("UX-1", "In Progress"),
        issue("UX-2", "M. Cancelled"),
        issue("UX-3", "Cancelled"),
      ]),
      params,
    );
    expect(active.map((i) => i.issueKey)).toEqual(["UX-1"]);
  });
});

describe("attentionPresentationSignalLabel", () => {
  it("maps review stall reasons to Long Review instead of Stable", () => {
    const label = attentionPresentationSignalLabel({
      reason: "Review for 5 days",
      health: {
        status: "stable",
        reasons: [],
        variant: "neutral",
      },
    });
    expect(label).toBe("Long Review");
    expect(label).not.toBe("Stable");
  });
});

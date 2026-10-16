import { describe, expect, it } from "vitest";
import type { Person } from "../people/types";
import type { AuditIssue } from "../jira/types";
import {
  attentionPresentationSignalLabel,
  classifyIssueAttention,
  getActiveIssues,
} from "./taskSignals";
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
    currentAssigneeCanonical: "1",
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
  it("labels a long Review from the structured reason code, never from text or raw health", () => {
    const reviewIssue: AuditIssue = {
      ...issue("UX-9", "In Review"),
      events: [
        {
          eventType: "Status",
          changedAt: "2026-02-02T10:00:00.000Z",
          changedBy: "u",
          fromValue: "In Progress",
          toValue: "In Review",
          timeSincePreviousStatusMs: 0,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromBackflow: false,
        },
      ],
    };
    const attention = classifyIssueAttention(
      reviewIssue,
      params,
      new Date("2026-02-12T10:00:00.000Z"),
    );
    expect(attention).not.toBeNull();
    expect(attention?.health.stageKind).toBe("review");
    const label = attentionPresentationSignalLabel(attention!);
    expect(label).toBe("Long Review");
    expect(label).not.toBe("Stable");
  });
});

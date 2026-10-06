import { describe, expect, it } from "vitest";
import type { AuditIssue } from "../jira/types";
import type { Person } from "../people/types";
import {
  buildTaskListModalRowsFromIssueKeys,
  formatTaskCreatedLabel,
  formatTaskLastStatusChangeLabel,
} from "./buildTaskListModalRows";

function personWithIssue(issue: AuditIssue): Person {
  return {
    id: "p1",
    bamboo: {
      employeeId: "p1",
      displayName: "Test",
      workEmail: "t@test.com",
      jobTitle: "Eng",
      department: "Eng",
      hireDate: "2020-01-01",
    },
    issues: [issue],
    availability: { label: "Available", state: "available" },
  } as Person;
}

describe("buildTaskListModalRowsFromIssueKeys", () => {
  it("maps created date and Jira URL", () => {
    const issue: AuditIssue = {
      issueKey: "UX-1",
      issueSummary: "Summary",
      issueCreated: "2026-01-15T10:00:00.000Z",
      assigneeName: "Test",
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
      currentStatus: "In Progress",
    };
    const rows = buildTaskListModalRowsFromIssueKeys(
      ["UX-1"],
      [personWithIssue(issue)],
      "https://jira.example.com",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.createdLabel).toBe(formatTaskCreatedLabel(issue.issueCreated));
    expect(rows[0]?.jiraUrl).toBe("https://jira.example.com/browse/UX-1");
  });

  it("uses latest status transition from issue events", () => {
    const issue: AuditIssue = {
      issueKey: "UX-2",
      issueSummary: "Summary",
      issueCreated: "2026-01-10T10:00:00.000Z",
      assigneeName: "Test",
      issueTypeName: "Task",
      contentType: "none",
      designImprovementType: "",
      epicKey: "",
      epicSummary: "",
      epicStatus: "",
      epicContentType: "",
      epicDesignImprovementType: "",
      events: [
        {
          eventType: "Status",
          changedAt: "2026-01-12T08:00:00.000Z",
          changedBy: "user",
          fromValue: "Open",
          toValue: "In Progress",
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
        {
          eventType: "Status",
          changedAt: "2026-01-20T14:30:00.000Z",
          changedBy: "user",
          fromValue: "In Progress",
          toValue: "Review",
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false,
        },
      ],
      rangeEvents: [],
      currentStatus: "Review",
    };
    const rows = buildTaskListModalRowsFromIssueKeys(["UX-2"], [personWithIssue(issue)]);
    expect(rows[0]?.lastStatusChangedAt).toBe("2026-01-20T14:30:00.000Z");
    expect(rows[0]?.lastStatusChangeLabel).toBe(
      formatTaskLastStatusChangeLabel("2026-01-20T14:30:00.000Z"),
    );
  });

  it("falls back when no status transition exists", () => {
    const issue: AuditIssue = {
      issueKey: "UX-3",
      issueSummary: "Summary",
      issueCreated: "2026-01-10T10:00:00.000Z",
      assigneeName: "Test",
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
      currentStatus: "Open",
    };
    const rows = buildTaskListModalRowsFromIssueKeys(["UX-3"], [personWithIssue(issue)]);
    expect(rows[0]?.lastStatusChangeLabel).toBe("—");
  });

  it("preserves issue key ordering", () => {
    const rows = buildTaskListModalRowsFromIssueKeys(
      ["B-2", "A-1", "C-3"],
      [],
      "https://jira.example.com",
    );
    expect(rows.map((row) => row.issueKey)).toEqual(["B-2", "A-1", "C-3"]);
  });
});

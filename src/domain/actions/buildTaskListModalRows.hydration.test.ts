import { describe, expect, it } from "vitest";
import type { AuditIssue } from "../jira/types";
import { buildIssueCatalog } from "../jira/issueCatalog";
import {
  buildTaskListModalRowsFromIssueKeys,
  TASK_LIST_ISSUE_UNAVAILABLE_TITLE,
} from "./buildTaskListModalRows";

function agtc105(): AuditIssue {
  return {
    issueKey: "AGTC-105",
    issueSummary: "Canonical summary for AGTC-105",
    issueCreated: "2025-11-12T09:00:00.000Z",
    assigneeName: "Andrei",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    currentStatus: "In Review",
    events: [
      {
        eventType: "Status",
        changedAt: "2025-12-01T10:00:00.000Z",
        changedBy: "user",
        fromValue: "In Progress",
        toValue: "In Review",
        timeSincePreviousStatusMs: null,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromEfficiencyBackflow: false,
      },
    ],
    rangeEvents: [],
  };
}

describe("buildTaskListModalRows issue hydration", () => {
  it("resolves AGTC-105 metadata from catalog when persons list is empty", () => {
    const catalog = buildIssueCatalog({ issues: [agtc105()] });
    const rows = buildTaskListModalRowsFromIssueKeys(
      ["AGTC-105"],
      [],
      "https://jira.example.com",
      catalog,
    );
    expect(rows[0]?.title).toBe("Canonical summary for AGTC-105");
    expect(rows[0]?.status).toBe("In Review");
    expect(rows[0]?.createdLabel).not.toBe("—");
    expect(rows[0]?.lastStatusChangeLabel).not.toBe("—");
    expect(rows[0]?.jiraUrl).toContain("AGTC-105");
  });

  it("does not substitute issue key as title when metadata is missing", () => {
    const rows = buildTaskListModalRowsFromIssueKeys(["UX-2962"], []);
    expect(rows[0]?.title).toBe(TASK_LIST_ISSUE_UNAVAILABLE_TITLE);
    expect(rows[0]?.title).not.toBe("UX-2962");
  });
});

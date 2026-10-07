import { describe, expect, it } from "vitest";
import type { AuditIssue } from "../jira/types";
import {
  isActiveWorkloadStatus,
  isReviewWorkloadStatus,
} from "./workloadStatusClassification";
import { calculateWorkload } from "../workload/workloadEngine";

const params = {
  dateFrom: "2026-01-01",
  dateTo: "2026-03-01",
  targetReviewDays: 3,
  users: [],
  projects: [],
};

function issue(status: string, key = "UX-1"): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: "2026-01-05T10:00:00.000Z",
    assigneeName: "User",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    currentStatus: status,
    events: [
      {
        eventType: "Status",
        changedAt: "2026-01-06T10:00:00.000Z",
        changedBy: "user",
        fromValue: "To Do",
        toValue: status,
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

describe("workloadStatusClassification", () => {
  it("treats In Review as review signal but not active workload", () => {
    const inReview = issue("In Review");
    expect(isReviewWorkloadStatus(inReview)).toBe(true);
    expect(isActiveWorkloadStatus(inReview)).toBe(false);
  });

  it("keeps In Progress in active workload", () => {
    const active = issue("In Progress");
    expect(isActiveWorkloadStatus(active)).toBe(true);
    expect(isReviewWorkloadStatus(active)).toBe(false);
  });

  it("does not mark overloaded from review-only backlog", () => {
    const reviewIssues = Array.from({ length: 8 }, (_, i) =>
      issue("In Review", `UX-R${i}`),
    );
    const workload = calculateWorkload(reviewIssues, params);
    expect(workload.activeWorkCount).toBe(0);
    expect(workload.reviewCount).toBe(8);
    expect(workload.level).not.toBe("overloaded");
  });
});

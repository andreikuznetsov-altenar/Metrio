import { describe, expect, it } from "vitest";
import { aggregateStaleReviewActions } from "./dedupeActions";
import {
  isTaskCountContextLine,
  queueTaskCountExtraContext,
  shouldLinkQueueTaskCount,
  uniqueIssueKeysForAction,
} from "./dashboardQueueTaskCount";
import type { ActionItem } from "./actionTypes";
import { presentationContextLinesForItem } from "./actionPresentation";

describe("dashboardQueueTaskCount", () => {
  it("detects task-count context lines", () => {
    expect(isTaskCountContextLine("30 tasks")).toBe(true);
    expect(isTaskCountContextLine("8 active tasks")).toBe(true);
    expect(isTaskCountContextLine("112 days in review")).toBe(false);
  });

  it("links aggregate review rows with issueKeys and strips count from extra context", () => {
    const aggregate = aggregateStaleReviewActions(
      Array.from({ length: 12 }, (_, i) => ({
        issueKey: `UX-${100 + i}`,
        daysInReview: 9,
      })),
    );
    expect(aggregate).not.toBeNull();
    const lines = presentationContextLinesForItem(aggregate!);
    expect(shouldLinkQueueTaskCount(aggregate!, lines)).toBe(true);
    expect(uniqueIssueKeysForAction(aggregate!).length).toBe(12);
    expect(queueTaskCountExtraContext(lines)[0]).toMatch(/UX-100/);
  });

  it("does not link workload active-task counts without issueKeys", () => {
    const workload: ActionItem = {
      id: "workload-1",
      kind: "workload",
      severity: "warning",
      title: "Alex has 8 active tasks",
      personId: "alex",
      personName: "Alex",
      count: 8,
      target: { kind: "person", personId: "alex", tab: "work" },
      source: "jira",
    };
    const lines = presentationContextLinesForItem(workload);
    expect(lines[0]).toBe("8 active tasks");
    expect(shouldLinkQueueTaskCount(workload, lines)).toBe(false);
  });

  it("does not link zero or single-key collections", () => {
    const empty: ActionItem = {
      id: "empty",
      kind: "review_bottleneck",
      severity: "info",
      title: "0 tasks",
      count: 0,
      issueKeys: [],
      target: { kind: "delivery-risk" },
      source: "jira",
    };
    expect(shouldLinkQueueTaskCount(empty, ["0 tasks"])).toBe(false);

    const single: ActionItem = {
      id: "one",
      kind: "review_bottleneck",
      severity: "info",
      title: "1 task",
      count: 1,
      issueKeys: ["UX-1"],
      target: { kind: "delivery-risk" },
      source: "jira",
    };
    expect(shouldLinkQueueTaskCount(single, ["1 tasks"])).toBe(false);
  });
});

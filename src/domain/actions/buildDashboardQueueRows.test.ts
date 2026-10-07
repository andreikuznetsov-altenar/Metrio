import { describe, expect, it } from "vitest";
import { aggregateStaleReviewActions } from "./dedupeActions";
import { buildDashboardQueueRows } from "./buildDashboardQueueRows";
import type { ActionItem } from "./actionTypes";

function jiraItem(
  partial: Partial<ActionItem> & Pick<ActionItem, "id" | "kind" | "target">,
): ActionItem {
  return {
    severity: "warning",
    title: "UX-1490",
    ...partial,
    target: partial.target,
  };
}

describe("buildDashboardQueueRows", () => {
  it("merges same Jira issue from Long Review and No activity into one row", () => {
    const longReview: ActionItem = {
      id: "lr-1490",
      kind: "review_bottleneck",
      severity: "warning",
      title: "UX-1490",
      description: "In Review · 112 days",
      target: { kind: "jira", issueKey: "UX-1490" },
    };
    const noActivity: ActionItem = {
      id: "na-1490",
      kind: "task_attention",
      severity: "info",
      title: "UX-1490",
      description: "No activity for 7+ days",
      target: { kind: "jira", issueKey: "UX-1490" },
    };

    const rows = buildDashboardQueueRows([longReview, noActivity]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.subject).toBe("UX-1490");
    expect(rows[0]!.reasonTags).toEqual(["No activity", "Long Review"]);
    expect(rows[0]!.contextLines).toEqual(
      expect.arrayContaining(["112 days in review", "No activity for 7+ days"]),
    );
    expect(rows[0]!.severity).toBe("warning");
  });

  it("merges UX-1502 pair with both reason tags and single navigation item", () => {
    const items: ActionItem[] = [
      {
        id: "lr-1502",
        kind: "review_bottleneck",
        severity: "critical",
        title: "UX-1502",
        description: "In Review · 95 days",
        target: { kind: "jira", issueKey: "UX-1502" },
      },
      {
        id: "na-1502",
        kind: "task_attention",
        severity: "warning",
        title: "UX-1502",
        description: "No activity for 7+ days",
        target: { kind: "jira", issueKey: "UX-1502" },
      },
    ];
    const rows = buildDashboardQueueRows(items);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.reasonTags).toContain("Long Review");
    expect(rows[0]!.reasonTags).toContain("No activity");
    expect(rows[0]!.item.target).toEqual({ kind: "jira", issueKey: "UX-1502" });
  });

  it("does not treat aggregate team Long Review issue preview as status context", () => {
    const aggregate = aggregateStaleReviewActions(
      Array.from({ length: 30 }, (_, i) => ({
        issueKey: `UX-${1490 + i}`,
        daysInReview: 10,
      })),
    );
    expect(aggregate).not.toBeNull();
    const [row] = buildDashboardQueueRows([aggregate!]);
    expect(row.subject).toBe("30 tasks in Review for 7+ days");
    expect(row.reasonTags).toEqual(["Long Review"]);
    expect(row.contextLines[0]).toBe("30 tasks");
    expect(row.contextLines.some((line) => line === "UX-1490")).toBe(false);
    expect(row.contextLines.join(" ")).toMatch(/UX-1490/);
  });

  it("places grouped Long Review row before person workload rows", () => {
    const aggregate = aggregateStaleReviewActions(
      Array.from({ length: 12 }, (_, i) => ({
        issueKey: `UX-${100 + i}`,
        daysInReview: 9,
      })),
    );
    expect(aggregate).not.toBeNull();
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
    const rows = buildDashboardQueueRows([workload, aggregate!]);
    expect(rows[0]!.subject).toBe("12 tasks in Review for 7+ days");
    expect(rows[1]!.subject).toBe("Alex");
  });

  it("preserves source priority order when un-sorted", () => {
    const a = jiraItem({
      id: "a",
      kind: "task_attention",
      title: "UX-1",
      target: { kind: "jira", issueKey: "UX-1" },
    });
    const b = jiraItem({
      id: "b",
      kind: "task_attention",
      title: "UX-2",
      target: { kind: "jira", issueKey: "UX-2" },
    });
    const rows = buildDashboardQueueRows([a, b]);
    expect(rows.map((r) => r.subject)).toEqual(["UX-1", "UX-2"]);
  });
});

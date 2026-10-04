import { describe, expect, it } from "vitest";
import { summarizeGoalsForHome } from "../domain/goals/goalReview";
import type { Goal } from "../domain/goals/goalTypes";

function goal(partial: Partial<Goal> & Pick<Goal, "id">): Goal {
  return {
    id: partial.id,
    title: partial.title ?? "Goal",
    status: partial.status ?? "active",
    scope: partial.scope ?? "person",
    progressMode: partial.progressMode ?? "manual",
    linkedJiraIssueKeys: partial.linkedJiraIssueKeys ?? [],
    linkedJiraProjectKeys: partial.linkedJiraProjectKeys ?? [],
    linkedConfluencePageIds: partial.linkedConfluencePageIds ?? [],
    employeeMayEditManualProgress: partial.employeeMayEditManualProgress ?? true,
    reviewDate: partial.reviewDate,
    ownerPersonId: partial.ownerPersonId ?? "p1",
    createdAt: partial.createdAt ?? "2026-01-01",
    updatedAt: partial.updatedAt ?? "2026-01-01",
    ...partial,
  };
}

describe("UI Repair Pass 5F", () => {
  it("flags goal reviews that need dashboard attention", () => {
    const now = new Date(2026, 9, 4, 12, 0, 0);
    const summary = summarizeGoalsForHome(
      [
        goal({ id: "g1", reviewDate: "2026-10-08" }),
        goal({ id: "g2", reviewDate: "2026-12-01" }),
      ],
      now,
    );
    expect(summary.reviewApproachingCount).toBe(1);
    expect(summary.needsAttention).toBe(true);
  });

  it("treats overdue reviews as needing attention", () => {
    const now = new Date(2026, 9, 4, 12, 0, 0);
    const summary = summarizeGoalsForHome(
      [goal({ id: "g1", reviewDate: "2026-10-01" })],
      now,
    );
    expect(summary.overdueReviewCount).toBe(1);
    expect(summary.needsAttention).toBe(true);
  });

  it("does not require attention when reviews are distant", () => {
    const now = new Date(2026, 9, 4, 12, 0, 0);
    const summary = summarizeGoalsForHome(
      [goal({ id: "g1", reviewDate: "2026-12-01" })],
      now,
    );
    expect(summary.needsAttention).toBe(false);
  });
});

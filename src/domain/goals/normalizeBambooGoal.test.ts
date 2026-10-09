import { describe, expect, it } from "vitest";
import {
  milestoneSummary,
  normalizeAlignmentOptions,
  normalizeBambooGoal,
  normalizeBambooGoalList,
  parseCanCreateGoals,
} from "./normalizeBambooGoal";

describe("normalizeBambooGoal", () => {
  it("normalizes list and derives milestone progress", () => {
    const goals = normalizeBambooGoalList(
      {
        goals: [
          {
            id: 1,
            title: "Grow",
            percentComplete: 25,
            status: "inProgress",
            sharedWithEmployeeIds: [5],
            dueDate: "2026-11-01",
            milestones: [
              { id: "m1", title: "One", completed: true },
              { id: "m2", title: "Two", completed: false },
              { id: "m3", title: "Three", completed: false },
              { id: "m4", title: "Four", completed: false },
            ],
          },
        ],
      },
      "5",
    );
    expect(goals).toHaveLength(1);
    expect(goals[0].employeeId).toBe("5");
    expect(goals[0].hasMilestones).toBe(true);
    expect(goals[0].percentComplete).toBe(25);
    expect(milestoneSummary(goals[0])).toBe("1 of 4 milestones");
  });

  it("parses canCreateGoals", () => {
    expect(parseCanCreateGoals({ canCreateGoals: true })).toBe(true);
    expect(parseCanCreateGoals({})).toBe(false);
  });

  it("reads Bamboo alignsWithOptions for alignment", () => {
    const options = normalizeAlignmentOptions({
      alignsWithOptions: [{ id: "a1", title: "Company OKR" }],
    });
    expect(options).toEqual([
      expect.objectContaining({ id: "a1", title: "Company OKR" }),
    ]);
  });

  it("returns null without id/title", () => {
    expect(normalizeBambooGoal({ id: "1" }, "1")).toBeNull();
  });

  it("uses startDate then createdDate for setDate", () => {
    const withStart = normalizeBambooGoal(
      { id: "1", title: "G", startDate: "2026-05-10", dueDate: "2026-06-01" },
      "5",
    );
    expect(withStart?.setDate).toBe("2026-05-10");
    expect(withStart?.startDateIsExplicit).toBe(true);

    const withCreated = normalizeBambooGoal(
      {
        id: "2",
        title: "G2",
        createdDate: "2026-03-01",
        dueDate: "2026-06-01",
      },
      "5",
    );
    expect(withCreated?.setDate).toBe("2026-03-01");
    expect(withCreated?.startDateIsExplicit).toBe(false);
  });
});

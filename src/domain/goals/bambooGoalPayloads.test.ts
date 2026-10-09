import { describe, expect, it } from "vitest";
import {
  BambooGoalValidationError,
  buildCreateGoalBody,
  buildSimpleProgressBody,
  buildUpdateGoalBody,
} from "./bambooGoalPayloads";
import { ensureOwnerInSharedWith } from "./normalizeBambooGoal";

describe("bambooGoalPayloads", () => {
  it("requires title and dueDate", () => {
    expect(() =>
      buildCreateGoalBody("10", {
        title: "",
        dueDate: "2026-12-01",
        sharedWithEmployeeIds: ["10"],
      }),
    ).toThrow(BambooGoalValidationError);
    expect(() =>
      buildCreateGoalBody("10", {
        title: "Q4",
        dueDate: "",
        sharedWithEmployeeIds: ["10"],
      }),
    ).toThrow(BambooGoalValidationError);
  });

  it("always includes owner in sharedWithEmployeeIds", () => {
    const body = buildCreateGoalBody("10", {
      title: "Ship",
      dueDate: "2026-12-01",
      sharedWithEmployeeIds: ["99"],
    });
    expect(body.sharedWithEmployeeIds).toEqual(expect.arrayContaining([10, 99]));
    expect(ensureOwnerInSharedWith("10", ["99"])).toEqual(["10", "99"]);
  });

  it("defaults simple progress to 0 and omits completionDate", () => {
    const body = buildCreateGoalBody("10", {
      title: "Ship",
      dueDate: "2026-12-01",
      sharedWithEmployeeIds: ["10"],
    });
    expect(body.percentComplete).toBe(0);
    expect(body.completionDate).toBeUndefined();
  });

  it("milestone goal does not send simple progress", () => {
    const body = buildCreateGoalBody("10", {
      title: "Ship",
      dueDate: "2026-12-01",
      sharedWithEmployeeIds: ["10"],
      milestones: [{ title: "A" }, { title: "B" }],
      percentComplete: 40,
    });
    expect(body.milestones).toEqual([{ title: "A" }, { title: "B" }]);
    expect(body.percentComplete).toBeUndefined();
  });

  it("normal edit omits milestones unless appending", () => {
    const body = buildUpdateGoalBody("10", {
      title: "Renamed",
      description: "x",
      dueDate: "2026-12-01",
      sharedWithEmployeeIds: ["10"],
      alignsWithOptionId: null,
    });
    expect(body.milestones).toBeUndefined();
    expect(body.title).toBe("Renamed");
    expect(body.sharedWithEmployeeIds).toEqual([10]);
  });

  it("simple progress requires completionDate at 100", () => {
    expect(buildSimpleProgressBody(50)).toEqual({ percentComplete: 50 });
    expect(() => buildSimpleProgressBody(100)).toThrow(BambooGoalValidationError);
    expect(buildSimpleProgressBody(100, "2026-10-09")).toEqual({
      percentComplete: 100,
      completionDate: "2026-10-09",
    });
  });
});

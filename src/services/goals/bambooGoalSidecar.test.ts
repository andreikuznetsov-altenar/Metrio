import { describe, expect, it } from "vitest";
import { countLegacyMetrioOnlyGoals } from "../../domain/goals/normalizeGoal";
import { isLegacyMetrioOnlyGoal, type Goal } from "../../domain/goals/goalTypes";
import {
  findBambooGoalSidecar,
  mergeBambooWithSidecarLinks,
} from "./bambooGoalSidecar";

function sampleGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "local-1",
    title: "Legacy title",
    ownerPersonId: "p1",
    scope: "person",
    status: "active",
    progressMode: "manual",
    linkedJiraIssueKeys: ["OLD-1"],
    linkedJiraProjectKeys: [],
    linkedConfluencePageIds: [],
    employeeMayEditManualProgress: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("bambooGoalSidecar source of truth", () => {
  it("Bamboo fields override stale local HR fields; sidecar links preserved", () => {
    const bamboo = {
      id: "77",
      title: "Bamboo title",
      description: "from bamboo",
      dueDate: "2026-12-01",
      percentComplete: 55,
      status: "in_progress" as const,
    };
    const sidecar = {
      bambooEmployeeId: "5",
      bambooGoalId: "77",
      linkedJiraIssueKeys: ["ABC-1"],
      linkedJiraProjectKeys: ["ABC"],
      linkedConfluencePageIds: ["page-9"],
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    const merged = mergeBambooWithSidecarLinks(bamboo, sidecar);
    expect(merged.title).toBe("Bamboo title");
    expect(merged.percentComplete).toBe(55);
    expect(merged.linkedJiraIssueKeys).toEqual(["ABC-1"]);
    expect(merged.linkedConfluencePageIds).toEqual(["page-9"]);
  });

  it("finds sidecar by bamboo employee + goal id", () => {
    const file = {
      schemaVersion: 1,
      goals: [],
      history: [],
      bambooSidecars: [
        {
          bambooEmployeeId: "5",
          bambooGoalId: "77",
          linkedJiraIssueKeys: ["X-1"],
          linkedJiraProjectKeys: [],
          linkedConfluencePageIds: [],
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      ],
    };
    expect(findBambooGoalSidecar(file, "5", "77")?.linkedJiraIssueKeys).toEqual([
      "X-1",
    ]);
    expect(findBambooGoalSidecar(file, "5", "missing")).toBeNull();
  });

  it("classifies goals without bambooGoalId as legacy Metrio-only", () => {
    const goals = [
      sampleGoal(),
      sampleGoal({ id: "local-2" }),
      {
        ...sampleGoal({ id: "linked" }),
        bambooGoalId: "99",
      } as Goal & { bambooGoalId: string },
    ];
    expect(isLegacyMetrioOnlyGoal(goals[0])).toBe(true);
    expect(countLegacyMetrioOnlyGoals(goals)).toBe(2);
  });
});

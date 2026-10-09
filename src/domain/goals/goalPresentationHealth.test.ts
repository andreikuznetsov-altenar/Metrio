import { describe, expect, it } from "vitest";
import type { BambooGoal } from "./bambooGoalTypes";
import {
  computeGoalScheduleHealth,
  resolveGoalPresentationStatus,
} from "./goalPresentationHealth";

function goal(overrides: Partial<BambooGoal> = {}): BambooGoal {
  return {
    id: "g1",
    employeeId: "1",
    title: "Test",
    percentComplete: 0,
    status: "in_progress",
    sharedWithEmployeeIds: ["1"],
    milestones: [],
    hasMilestones: false,
    setDate: "2026-10-01",
    dueDate: "2026-10-31",
    ...overrides,
  };
}

const midOctober = new Date("2026-10-16T12:00:00.000Z");

describe("goalPresentationHealth", () => {
  it("A — 55% at mid schedule → on track", () => {
    expect(
      computeGoalScheduleHealth(
        goal({ percentComplete: 55 }),
        midOctober,
      ),
    ).toBe("on_track");
  });

  it("B — 35% at mid schedule → watch", () => {
    expect(
      computeGoalScheduleHealth(
        goal({ percentComplete: 35 }),
        midOctober,
      ),
    ).toBe("watch");
  });

  it("C — 20% at mid schedule → at risk", () => {
    expect(
      computeGoalScheduleHealth(
        goal({ percentComplete: 20 }),
        midOctober,
      ),
    ).toBe("at_risk");
  });

  it("D — overdue below 100% → at risk", () => {
    expect(
      computeGoalScheduleHealth(
        goal({ percentComplete: 80, dueDate: "2026-10-10" }),
        midOctober,
      ),
    ).toBe("at_risk");
  });

  it("E — 100% → completed presentation", () => {
    const status = resolveGoalPresentationStatus(
      goal({ percentComplete: 100 }),
      midOctober,
    );
    expect(status.label).toBe("Completed");
    expect(status.health).toBe("completed");
  });

  it("missing start date → no schedule health", () => {
    expect(
      computeGoalScheduleHealth(
        goal({ setDate: null }),
        midOctober,
      ),
    ).toBeNull();
  });

  it("completed Bamboo status never shows at risk", () => {
    const status = resolveGoalPresentationStatus(
      goal({ status: "completed", percentComplete: 50 }),
      midOctober,
    );
    expect(status.label).toBe("Completed");
  });
});

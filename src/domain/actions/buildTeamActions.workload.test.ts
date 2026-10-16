import { describe, expect, it } from "vitest";
import type { TeamPerformanceSnapshot } from "../performance";
import { buildTeamActions } from "./buildTeamActions";

function snapshotWithOverloadedWorkload(): TeamPerformanceSnapshot {
  return {
    directReportIds: ["valeria"],
    summary: [],
    attention: [],
    attentionTotalCount: 0,
    trends: [],
    workload: [
      {
        personId: "valeria",
        personName: "Valeriia Pavlova",
        activeWork: 1,
        assignedWork: 14,
        atRisk: 0,
        workload: "Overloaded",
        availability: "Available",
        capacityDataState: "measured",
        capacityLoadPercent: 40,
      },
    ],
    timeOff: [],
    personDetails: {},
  };
}

describe("buildTeamActions workload copy", () => {
  it("does not present active-stage count as the person's whole workload", () => {
    const actions = buildTeamActions({
      snapshot: snapshotWithOverloadedWorkload(),
      deliveryRisk: [],
    });

    const workload = actions.find((action) => action.kind === "workload");
    expect(workload?.title).toBe("Valeriia Pavlova is Overloaded");
    expect(workload?.description).toBe("14 assigned tasks · 1 in progress");
    expect(workload?.count).toBe(14);
    expect(workload?.title).not.toContain("1 active tasks");
    expect(workload?.description).not.toMatch(/\b1 active tasks\b/);
  });
});

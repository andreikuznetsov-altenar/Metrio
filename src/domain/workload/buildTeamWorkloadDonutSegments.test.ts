import { describe, expect, it } from "vitest";
import {
  buildTeamWorkloadDonutSegments,
  teamWorkloadDonutMetricLabel,
  workloadDonutSupportingMetric,
  workloadDonutWeight,
} from "./buildTeamWorkloadDonutSegments";
import type { WorkloadRow } from "../performance";

const base = (overrides: Partial<WorkloadRow>): WorkloadRow => ({
  personId: "p1",
  activeWork: 3,
  atRisk: 0,
  workload: "Normal",
  availability: "Available",
  ...overrides,
});

describe("buildTeamWorkloadDonutSegments", () => {
  it("prefers measured capacity percent over active work", () => {
    const row = base({
      activeWork: 2,
      capacityDataState: "measured",
      capacityLoadPercent: 72.5,
    });
    expect(workloadDonutWeight(row)).toBe(72.5);
    const segments = buildTeamWorkloadDonutSegments([row]);
    expect(segments[0].detailLabel).toBe("72.5% capacity");
  });

  it("labels insufficient history in supporting metric copy", () => {
    const row = base({ capacityDataState: "insufficient_history" });
    expect(workloadDonutSupportingMetric(row)).toBe("Not enough history");
  });

  it("falls back to active work when capacity is insufficient", () => {
    const row = base({ activeWork: 5, capacityDataState: "insufficient_history" });
    expect(workloadDonutWeight(row)).toBe(5);
    expect(teamWorkloadDonutMetricLabel([row])).toContain("active work");
  });
});

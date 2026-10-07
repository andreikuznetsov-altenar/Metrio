import { describe, expect, it } from "vitest";
import {
  buildTeamWorkloadDonutSegments,
  selectDefaultTeamWorkloadDonutPersonId,
  teamWorkloadDonutColorForPerson,
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

  it("picks default person by largest share with team-order tie-break", () => {
    const rows = [
      base({ personId: "a", activeWork: 2, capacityDataState: "insufficient_history" }),
      base({
        personId: "b",
        activeWork: 5,
        capacityDataState: "measured",
        capacityLoadPercent: 40,
      }),
      base({
        personId: "c",
        activeWork: 1,
        capacityDataState: "measured",
        capacityLoadPercent: 40,
      }),
    ];
    expect(selectDefaultTeamWorkloadDonutPersonId(rows)).toBe("b");
  });

  it("assigns distinct stable colors per person", () => {
    const used = new Set<number>();
    const c1 = teamWorkloadDonutColorForPerson("person-a", used);
    const c2 = teamWorkloadDonutColorForPerson("person-b", used);
    expect(c1).not.toBe(c2);
    expect(c1).toContain("--team-donut-color-");
  });
});

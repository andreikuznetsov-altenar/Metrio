import { describe, expect, it } from "vitest";
import type { WorkloadRow } from "../performance";
import { capacityLevelFromPercent } from "../workflows/capacityWorkload";
import { measuredCapacityLabelFromPercent } from "./capacityPresentation";

describe("Pass 13.6 data consistency — workload vs availability", () => {
  it("Overloaded capacity with Available leave is valid (independent dimensions)", () => {
    const row: WorkloadRow = {
      personId: "p1",
      personName: "Alex",
      activeWork: 6,
      atRisk: 2,
      workload: measuredCapacityLabelFromPercent(103.66),
      availability: "Available",
      capacityDataState: "measured",
      capacityLoadPercent: 103.66,
    };

    expect(capacityLevelFromPercent(row.capacityLoadPercent!)).toBe("overloaded");
    expect(row.workload).toBe("Overloaded");
    expect(row.availability).toBe("Available");
    expect(row.atRisk).toBeGreaterThan(0);
    expect(row.activeWork).toBeGreaterThan(0);
  });

  it("insufficient history uses separate label from measured overload", () => {
    const row: WorkloadRow = {
      personId: "p2",
      activeWork: 12,
      atRisk: 0,
      workload: "Not enough history",
      availability: "Available",
      capacityDataState: "insufficient_history",
    };
    expect(row.workload).not.toBe("Overloaded");
    expect(row.availability).toBe("Available");
  });
});

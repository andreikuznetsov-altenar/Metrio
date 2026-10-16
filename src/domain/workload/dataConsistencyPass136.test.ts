import { describe, expect, it } from "vitest";
import type { WorkloadRow } from "../performance";
import { capacityLevelFromPercent } from "../workflows/capacityWorkload";
import { measuredCapacityLabelFromPercent } from "./capacityPresentation";

describe("Pass 13.6 data consistency — workload vs capacity vs availability", () => {
  it("current workload and historical capacity are independent dimensions", () => {
    const row: WorkloadRow = {
      personId: "p1",
      personName: "Alex",
      activeWork: 2,
      atRisk: 0,
      // Current operational queue can be Balanced...
      workload: "Balanced",
      availability: "Available",
      capacityDataState: "measured",
      // ...while historical elapsed-business-time capacity is >100%.
      capacityLoadPercent: 103.66,
    };

    expect(row.workload).toBe("Balanced");
    expect(capacityLevelFromPercent(row.capacityLoadPercent!)).toBe("overloaded");
    expect(measuredCapacityLabelFromPercent(row.capacityLoadPercent!)).toBe("Overloaded");
    expect(row.availability).toBe("Available");
  });

  it("insufficient capacity history does not erase current workload state", () => {
    const row: WorkloadRow = {
      personId: "p2",
      activeWork: 6,
      atRisk: 1,
      workload: "Heavy",
      availability: "Available",
      capacityDataState: "insufficient_history",
    };

    expect(row.workload).toBe("Heavy");
    expect(row.capacityDataState).toBe("insufficient_history");
    expect(row.availability).toBe("Available");
  });
});

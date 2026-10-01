import { describe, expect, it } from "vitest";
import { getEmployeePerformanceSnapshot } from "./employeePerformance";

describe("employeePerformance fixtures", () => {
  it("returns personal employee snapshot without team sections", () => {
    const snapshot = getEmployeePerformanceSnapshot(
      "person-alex",
      "30d",
      "personal",
      0,
    );

    expect(snapshot.personId).toBe("person-alex");
    expect(snapshot.metrics).toHaveLength(4);
    expect(snapshot.activeWork.length).toBeGreaterThan(0);
    expect(snapshot.history.length).toBeGreaterThan(0);
    expect(snapshot.trends).toHaveLength(4);
  });
});

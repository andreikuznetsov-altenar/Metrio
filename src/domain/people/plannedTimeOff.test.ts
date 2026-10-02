import { describe, expect, it } from "vitest";
import { buildPlannedTimeOffRows } from "./plannedTimeOff";

describe("buildPlannedTimeOffRows", () => {
  it("sorts upcoming entries and deduplicates", () => {
    const rows = buildPlannedTimeOffRows(
      [
        {
          employeeId: "2",
          name: "B",
          start: "2026-12-01",
          end: "2026-12-10",
          type: "Vacation",
        },
        {
          employeeId: "2",
          name: "B",
          start: "2026-12-01",
          end: "2026-12-10",
          type: "Vacation",
        },
        {
          employeeId: "1",
          name: "A",
          start: "2026-10-12",
          end: "2026-10-18",
          type: "Vacation",
        },
      ],
      new Set(["1", "2"]),
      new Date("2026-10-02"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].employeeId).toBe("1");
    expect(rows[1].employeeId).toBe("2");
  });
});

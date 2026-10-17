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

  it("renders a one-day leave as a single date and keeps multi-day ranges unchanged", () => {
    const label = (start: string, end: string) =>
      buildPlannedTimeOffRows(
        [{ employeeId: "1", name: "A", start, end, type: "Timeoff" }],
        new Set(["1"]),
        new Date("2026-10-02"),
      )[0].rangeLabel;
    expect(label("2026-10-30", "2026-10-30")).toBe("30 Oct 2026");
    expect(label("2026-12-24", "2026-12-24")).toBe("24 Dec 2026");
    expect(label("2026-10-12", "2026-10-18")).toBe("12–18 Oct 2026");
    expect(label("2026-10-30", "2026-11-02")).toBe("30 Oct 2026 – 2 Nov 2026");
    expect(label("2026-12-24", "2027-01-04")).toBe("24 Dec 2026 – 4 Jan 2027");
  });
});

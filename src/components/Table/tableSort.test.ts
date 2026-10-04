import { describe, expect, it } from "vitest";
import { nextSortState, parseDurationDays, sortRows } from "./tableSort";

describe("tableSort", () => {
  it("cycles sort asc -> desc -> default", () => {
    expect(nextSortState(null, "age")).toEqual({ columnId: "age", direction: "asc" });
    expect(nextSortState({ columnId: "age", direction: "asc" }, "age")).toEqual({
      columnId: "age",
      direction: "desc",
    });
    expect(nextSortState({ columnId: "age", direction: "desc" }, "age")).toBeNull();
  });

  it("sorts durations numerically", () => {
    const rows = [{ v: "112 days" }, { v: "13 days" }];
    const sorted = sortRows(
      rows,
      { columnId: "v", direction: "asc" },
      (row) => row.v,
      () => "duration",
    );
    expect(sorted[0].v).toBe("13 days");
  });

  it("parses sub-day ages", () => {
    expect(parseDurationDays("<1 day")).toBe(0.5);
  });
});

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

  it("sorts text columns case-insensitively", () => {
    const rows = [{ n: "Zeta" }, { n: "alpha" }];
    const sorted = sortRows(
      rows,
      { columnId: "n", direction: "asc" },
      (row) => row.n,
      () => "text",
    );
    expect(sorted.map((r) => r.n)).toEqual(["alpha", "Zeta"]);
  });

  it("sorts numeric columns", () => {
    const rows = [{ n: 3 }, { n: 1 }];
    const sorted = sortRows(
      rows,
      { columnId: "n", direction: "desc" },
      (row) => row.n,
      () => "number",
    );
    expect(sorted[0].n).toBe(3);
  });

  it("sorts date columns", () => {
    const rows = [{ d: "2026-10-01" }, { d: "2026-09-01" }];
    const sorted = sortRows(
      rows,
      { columnId: "d", direction: "asc" },
      (row) => row.d,
      () => "date",
    );
    expect(sorted[0].d).toBe("2026-09-01");
  });

  it("sorts status as text", () => {
    const rows = [{ s: "sent" }, { s: "draft" }];
    const sorted = sortRows(
      rows,
      { columnId: "s", direction: "asc" },
      (row) => row.s,
      () => "status",
    );
    expect(sorted[0].s).toBe("draft");
  });

  it("restores default order when sort cleared", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const sorted = sortRows(rows, null, (row) => row.id, () => "text");
    expect(sorted.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps stable order for equal values", () => {
    const rows = [{ id: 1, v: "x" }, { id: 2, v: "x" }];
    const sorted = sortRows(
      rows,
      { columnId: "v", direction: "asc" },
      (row) => row.v,
      () => "text",
    );
    expect(sorted.map((r) => r.id)).toEqual([1, 2]);
  });
});

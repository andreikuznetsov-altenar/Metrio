import { describe, expect, it } from "vitest";
import { buildDigestId, getLocalWeekKey } from "./digestIds";

describe("digestIds", () => {
  it("uses Monday as week key", () => {
    const monday = new Date(2026, 2, 2, 12, 0, 0);
    expect(getLocalWeekKey(monday)).toBe("2026-03-02");
    const sunday = new Date(2026, 2, 8, 23, 59, 0);
    expect(getLocalWeekKey(sunday)).toBe("2026-03-02");
  });

  it("builds stable daily and weekly ids", () => {
    const now = new Date(2026, 2, 2, 9, 0, 0);
    expect(buildDigestId("daily", "employee", now)).toBe(
      "daily:2026-03-02:employee",
    );
    expect(buildDigestId("weekly", "manager", now)).toBe(
      "weekly:2026-03-02:manager",
    );
  });
});

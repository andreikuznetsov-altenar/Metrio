import { describe, expect, it } from "vitest";
import { buildDigestId, getLocalWeekKey } from "./digestIds";

describe("digestIds", () => {
  it("uses Monday as week key", () => {
    // Instants are explicit so the result cannot depend on the host timezone.
    // Reporting calendar is Europe/Malta (CET, UTC+1 in early March).
    const monday = new Date("2026-03-02T11:00:00.000Z");
    expect(getLocalWeekKey(monday)).toBe("2026-03-02");
    const sunday = new Date("2026-03-08T22:59:00.000Z");
    expect(getLocalWeekKey(sunday)).toBe("2026-03-02");
  });

  it("builds stable daily and weekly ids", () => {
    const now = new Date("2026-03-02T08:00:00.000Z");
    expect(buildDigestId("daily", "employee", now)).toBe(
      "daily:2026-03-02:employee",
    );
    expect(buildDigestId("weekly", "manager", now)).toBe(
      "weekly:2026-03-02:manager",
    );
  });
});

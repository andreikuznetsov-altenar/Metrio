import { describe, expect, it } from "vitest";
import { isNewStarter, NEW_STARTER_DAYS } from "./newStarter";

describe("isNewStarter", () => {
  const today = new Date("2026-10-02T12:00:00.000Z");

  it("returns true within onboarding window", () => {
    expect(isNewStarter("2026-09-22", today)).toBe(true);
    const day59 = new Date(today);
    day59.setDate(day59.getDate() - (NEW_STARTER_DAYS - 1));
    expect(isNewStarter(day59.toISOString().slice(0, 10), today)).toBe(true);
  });

  it("returns false at day 60+", () => {
    expect(isNewStarter("2026-08-01", today)).toBe(false);
  });

  it("returns false without hireDate", () => {
    expect(isNewStarter(undefined, today)).toBe(false);
  });
});

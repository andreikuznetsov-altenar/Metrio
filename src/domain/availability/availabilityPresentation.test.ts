import { describe, expect, it } from "vitest";
import type { PersonAvailability } from "../people/types";
import { resolveAvailabilityPresentation } from "./availabilityPresentation";
import { personAvailabilityBadgeLabel, personAvailabilityDrawerLine } from "./personAvailabilityCopy";

const TODAY = new Date(2026, 9, 14, 12, 0, 0); // 14 Oct 2026, local
const iso = (offsetDays: number) => {
  const d = new Date(2026, 9, 14 + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const leave = (startOffset: number, lengthDays: number, over: Partial<PersonAvailability> = {}): PersonAvailability => ({
  state: "vacation_soon",
  label: "Vacation · Oct 19–23",
  startDate: iso(startOffset),
  endDate: iso(startOffset + lengthDays - 1),
  isHoliday: false,
  ...over,
});

describe("shared availability resolver", () => {
  it("FUTURE leave is upcoming wording, never 'On leave'", () => {
    const a = leave(5, 5);
    expect(personAvailabilityBadgeLabel(a, TODAY)).toBe("Vacation soon");
    expect(personAvailabilityDrawerLine(a, TODAY)).toBe("Vacation starts in 5 days · 19–23 Oct");
  });

  it("a non-vacation absence is generic 'Leave soon', not 'Vacation'", () => {
    const a = leave(5, 3, { label: "Sick leave · Oct 19–21" });
    expect(personAvailabilityBadgeLabel(a, TODAY)).toBe("Leave soon");
    expect(personAvailabilityDrawerLine(a, TODAY)).toMatch(/^Leave starts in 5 days/);
  });

  it("CURRENT leave is 'On leave'; leave that ended yesterday is 'Returns today'; older leave shows nothing", () => {
    expect(personAvailabilityBadgeLabel(leave(-1, 4, { state: "on_vacation" }), TODAY)).toBe("On leave");
    expect(personAvailabilityBadgeLabel(leave(0, 1, { state: "on_vacation" }), TODAY)).toBe("On leave");
    expect(personAvailabilityBadgeLabel(leave(-3, 3, { state: "returns_today" }), TODAY)).toBe("Returns today");
    expect(personAvailabilityBadgeLabel(leave(-10, 3, { state: "on_vacation" }), TODAY)).toBe("Available");
  });

  it("dates are authoritative over a stale persisted state", () => {
    expect(resolveAvailabilityPresentation(leave(-1, 4, { state: "vacation_soon" }), TODAY).phase).toBe("current");
    expect(resolveAvailabilityPresentation(leave(6, 2, { state: "on_vacation" }), TODAY).phase).toBe("upcoming");
  });

  it("falls back to state only when dates are missing", () => {
    const base = { label: "Vacation", isHoliday: false };
    expect(resolveAvailabilityPresentation({ ...base, state: "on_vacation" }, TODAY).badgeLabel).toBe("On leave");
    expect(resolveAvailabilityPresentation({ ...base, state: "vacation_soon" }, TODAY).badgeLabel).toBe("Vacation soon");
    expect(resolveAvailabilityPresentation({ ...base, state: "available" }, TODAY).badgeLabel).toBe("Available");
  });

  it("REGRESSION: header badge and availability line never disagree (no 'On leave' + 'starts in N days')", () => {
    for (let offset = -14; offset <= 30; offset += 1) {
      for (const state of ["available", "vacation_soon", "vacation_tomorrow", "on_vacation", "returns_today"] as const) {
        const a = leave(offset, 4, { state });
        const badge = personAvailabilityBadgeLabel(a, TODAY);
        const line = personAvailabilityDrawerLine(a, TODAY);
        if (/starts (in \d+ days|tomorrow|today)/.test(line) && offset > 0) expect(badge).not.toBe("On leave");
        if (badge === "On leave") expect(line).not.toMatch(/starts (in|tomorrow)/);
        if (badge === "Vacation soon") expect(line).toMatch(/^Vacation starts/);
      }
    }
  });
});

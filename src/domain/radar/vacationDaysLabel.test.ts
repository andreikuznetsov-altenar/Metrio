import { afterEach, describe, expect, it } from "vitest";
import { setAppClock, setAppClockFixed } from "../../platform/appClock";
import type { Person } from "../people/types";
import { vacationDaysLabel } from "./taskSignals";

afterEach(() => setAppClock(null));

const person = (state: Person["availability"]["state"], startDate?: string): Person =>
  ({ availability: { state, label: "Vacation · Oct 20–24", startDate, isHoliday: false } }) as unknown as Person;

describe("vacationDaysLabel", () => {
  it("uses a human countdown, never a raw ISO date", () => {
    setAppClockFixed("2026-10-14T09:30:00.000Z");
    expect(vacationDaysLabel(person("vacation_soon", "2026-10-20"))).toBe("Vacation starts in 6 days");
    expect(vacationDaysLabel(person("vacation_tomorrow", "2026-10-15"))).toBe("Vacation starts tomorrow");
    expect(vacationDaysLabel(person("vacation_soon"))).toBe("Vacation starting soon");
    expect(vacationDaysLabel(person("available"))).toBeNull();
  });
});

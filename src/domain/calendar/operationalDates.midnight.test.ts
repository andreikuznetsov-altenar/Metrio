import { afterEach, describe, expect, it } from "vitest";
import { classifyAvailability, pickRelevantTimeOff } from "../people/availability";
import { calendarDaysUntil, formatLeaveCountdown } from "../availability/leaveCalendar";
import { buildPlannedTimeOffRows, getWhosOutHorizonRange } from "../people/plannedTimeOff";
import { isNewStarter, newStarterDayNumber } from "../onboarding/newStarter";
import { getWhosOutDateRange } from "../../services/people/personService";
import { setAppClock, setAppClockFixed } from "../../platform/appClock";
import { reportingDateKey } from "./reportingDay";

/**
 * Operational "today" (who is away, when leave starts, days since hire) is the reporting-calendar
 * date, the same date trends, snapshots and capacity use. Leave and hire dates are date-only
 * values; only "today" depends on the clock. Results must not vary with the host time zone.
 */
describe("operational date semantics around Malta midnight", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    setAppClock(null);
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  const hostZones = ["UTC", "Europe/Malta", "America/New_York"];
  // 21:30Z: 23:30 Malta, the 16th. 22:30Z: 00:30 Malta, the 17th, while UTC and New York are
  // still on the 16th. 00:30Z on the 17th: the 17th in UTC, still the 16th in New York.
  const instants = [
    { at: "2026-10-16T21:30:00.000Z", key: "2026-10-16" },
    { at: "2026-10-16T22:30:00.000Z", key: "2026-10-17" },
    { at: "2026-10-17T00:30:00.000Z", key: "2026-10-17" },
  ];

  /** Runs `read` under every host zone and requires one identical result. */
  const sameInEveryZone = <T,>(read: () => T): T => {
    const results = hostZones.map((tz) => {
      process.env.TZ = tz;
      return read();
    });
    for (const result of results) expect(result).toEqual(results[0]);
    return results[0];
  };

  it("classifies availability against the reporting date", () => {
    const leave = { type: "Vacation", start: "2026-10-17", end: "2026-10-18" };
    for (const { at, key } of instants) {
      const state = sameInEveryZone(() => classifyAvailability(leave, new Date(at)).state);
      expect(state, at).toBe(key === "2026-10-16" ? "vacation_tomorrow" : "on_vacation");
    }
    const returning = { type: "Vacation", start: "2026-10-14", end: "2026-10-16" };
    expect(sameInEveryZone(() => classifyAvailability(returning, new Date(instants[0].at)).state)).toBe("on_vacation");
    expect(sameInEveryZone(() => classifyAvailability(returning, new Date(instants[1].at)).state)).toBe("returns_today");
  });

  it("picks the relevant time off against the reporting date", () => {
    const entries = [{ employeeId: "1", start: "2026-10-16", end: "2026-10-16" }];
    expect(sameInEveryZone(() => pickRelevantTimeOff(entries, "1", new Date(instants[0].at)) !== null)).toBe(true);
    expect(sameInEveryZone(() => pickRelevantTimeOff(entries, "1", new Date(instants[1].at)) !== null)).toBe(false);
  });

  it("counts leave countdown days from the reporting date", () => {
    expect(sameInEveryZone(() => calendarDaysUntil("2026-10-17", new Date(instants[0].at)))).toBe(1);
    expect(sameInEveryZone(() => calendarDaysUntil("2026-10-17", new Date(instants[1].at)))).toBe(0);
    expect(sameInEveryZone(() => formatLeaveCountdown("2026-10-17", new Date(instants[0].at)))).toBe("starts tomorrow");
    expect(sameInEveryZone(() => formatLeaveCountdown("2026-10-17", new Date(instants[2].at)))).toBe("starts today");
  });

  it("anchors the who's-out window and planned rows to the reporting date", () => {
    const entries = [{ employeeId: "1", start: "2026-10-15", end: "2026-10-16" }];
    for (const { at, key } of instants) {
      const now = new Date(at);
      expect(sameInEveryZone(() => getWhosOutHorizonRange(now).start), at).toBe(key);
      expect(sameInEveryZone(() => getWhosOutHorizonRange(now).end), at).toBe(
        key === "2026-10-16" ? "2027-10-16" : "2027-10-17",
      );
      const rows = sameInEveryZone(() => buildPlannedTimeOffRows(entries, new Set(["1"]), now).length);
      expect(rows, at).toBe(key === "2026-10-16" ? 1 : 0);
      setAppClockFixed(at);
      expect(sameInEveryZone(() => getWhosOutDateRange()), at).toEqual({
        start: key,
        end: key === "2026-10-16" ? "2026-11-15" : "2026-11-16",
      });
      expect(reportingDateKey(now)).toBe(key);
    }
  });

  it("counts new-starter days from the reporting date", () => {
    // Hired on the reporting date of the later instants: not started yet at 21:30Z, day 1 after.
    expect(sameInEveryZone(() => isNewStarter("2026-10-17", new Date(instants[0].at)))).toBe(false);
    expect(sameInEveryZone(() => isNewStarter("2026-10-17", new Date(instants[1].at)))).toBe(true);
    expect(sameInEveryZone(() => newStarterDayNumber("2026-10-17", new Date(instants[1].at)))).toBe(1);
    expect(sameInEveryZone(() => newStarterDayNumber("2026-10-17", new Date(instants[2].at)))).toBe(1);
    // The 60-day window ends the day it would reach day 61.
    expect(sameInEveryZone(() => isNewStarter("2026-08-18", new Date(instants[0].at)))).toBe(true);
    expect(sameInEveryZone(() => isNewStarter("2026-08-18", new Date(instants[1].at)))).toBe(false);
  });
});

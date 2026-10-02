import { describe, expect, it } from "vitest";
import {
  calendarDaysUntil,
  formatLeaveCountdown,
  formatLeaveRangeLabel,
  parseCalendarDate,
} from "./leaveCalendar";

describe("leaveCalendar", () => {
  const today = new Date("2026-10-02T15:00:00.000Z");

  it("uses calendar days without UTC shift for date-only values", () => {
    expect(calendarDaysUntil("2026-10-09", today)).toBe(7);
    expect(formatLeaveCountdown("2026-10-09", today)).toBe("starts in 7 days");
  });

  it("formats same-month ranges", () => {
    expect(formatLeaveRangeLabel("2026-10-12", "2026-10-16")).toBe("12–16 Oct");
  });

  it("parses yyyy-MM-dd at local start of day", () => {
    const d = parseCalendarDate("2026-10-12");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(9);
    expect(d!.getDate()).toBe(12);
  });

  it("covers milestone countdowns", () => {
    expect(formatLeaveCountdown("2026-10-02", today)).toBe("starts today");
    expect(formatLeaveCountdown("2026-10-03", today)).toBe("starts tomorrow");
    expect(formatLeaveCountdown("2026-10-05", today)).toBe("starts in 3 days");
    expect(formatLeaveCountdown("2026-10-01", today)).toBe("starts today");
  });
});

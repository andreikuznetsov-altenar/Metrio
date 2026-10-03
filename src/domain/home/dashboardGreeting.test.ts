import { describe, expect, it } from "vitest";
import { formatDashboardGreeting, greetingForHour } from "./dashboardGreeting";

describe("dashboardGreeting", () => {
  it("uses morning, afternoon, and evening boundaries in local time", () => {
    expect(greetingForHour(new Date("2026-03-01T08:30:00"))).toBe("Good morning");
    expect(greetingForHour(new Date("2026-03-01T13:00:00"))).toBe("Good afternoon");
    expect(greetingForHour(new Date("2026-03-01T20:00:00"))).toBe("Good evening");
    expect(greetingForHour(new Date("2026-03-01T03:00:00"))).toBe("Good evening");
  });

  it("formats greeting with first name", () => {
    expect(
      formatDashboardGreeting("Andrei Kuznetsov", new Date("2026-03-01T09:00:00")),
    ).toBe("Good morning, Andrei");
  });
});

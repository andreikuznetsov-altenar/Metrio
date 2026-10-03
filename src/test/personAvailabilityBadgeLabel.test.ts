import { describe, expect, it } from "vitest";
import { personAvailabilityBadgeLabel } from "../domain/availability/personAvailabilityCopy";

describe("personAvailabilityBadgeLabel", () => {
  it("returns Available for available state", () => {
    expect(
      personAvailabilityBadgeLabel({ state: "available", label: "Available" }),
    ).toBe("Available");
  });

  it("returns On leave for vacation states", () => {
    expect(
      personAvailabilityBadgeLabel({
        state: "on_vacation",
        label: "On time off",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      }),
    ).toBe("On leave");
  });
});

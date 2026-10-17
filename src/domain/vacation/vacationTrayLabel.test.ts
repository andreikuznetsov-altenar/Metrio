import { describe, expect, it } from "vitest";
import { vacationTrayLabelForPerson } from "./vacationTrayLabel";
import type { Person } from "../people/types";

const person = (startDate: string, endDate: string) =>
  ({ availability: { state: "on_vacation", label: "On vacation", startDate, endDate, isHoliday: false } }) as unknown as Person;

describe("vacationTrayLabelForPerson", () => {
  it("shows a one-day leave as a single date", () => {
    expect(vacationTrayLabelForPerson(person("2026-10-30", "2026-10-30"))).toBe("Vacation today · 30 Oct");
  });

  it("keeps multi-day ranges unchanged", () => {
    expect(vacationTrayLabelForPerson(person("2026-10-12", "2026-10-16"))).toBe("Vacation today · 12–16 Oct");
    expect(vacationTrayLabelForPerson(person("2026-10-30", "2026-11-02"))).toBe("Vacation today · 30 Oct–2 Nov");
  });
});

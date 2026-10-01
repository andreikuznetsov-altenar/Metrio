import { describe, expect, it } from "vitest";
import { canOpenPersonDetail } from "./personAccess";
import { getFixtureUser } from "../fixtures/currentUsers";

describe("canOpenPersonDetail", () => {
  it("allows employees to open only themselves", () => {
    const employee = getFixtureUser("employee");
    expect(canOpenPersonDetail(employee, employee.person.id)).toBe(true);
    expect(canOpenPersonDetail(employee, "person-sam")).toBe(false);
  });

  it("allows managers to open direct reports only", () => {
    const lead = getFixtureUser("lead");
    const reportId = lead.team!.directReportIds[0];

    expect(canOpenPersonDetail(lead, reportId)).toBe(true);
    expect(canOpenPersonDetail(lead, "person-jordan")).toBe(false);
    expect(canOpenPersonDetail(lead, lead.person.id)).toBe(true);
  });
});

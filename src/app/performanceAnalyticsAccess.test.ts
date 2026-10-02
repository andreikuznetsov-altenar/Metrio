import { describe, expect, it } from "vitest";
import { canOpenAnalyticsDrilldown } from "./performanceAnalyticsContext";
import { canOpenPersonDetail } from "../domain/personAccess";
import { getFixtureUser } from "../fixtures/currentUsers";

describe("canOpenAnalyticsDrilldown", () => {
  it("allows self-scoped person drill-down for the current employee", () => {
    const employee = getFixtureUser("employee");
    expect(
      canOpenAnalyticsDrilldown(
        { personId: employee.person.id },
        (id) => canOpenPersonDetail(employee, id),
        false,
      ),
    ).toBe(true);
  });

  it("blocks another person's drill-down for employees", () => {
    const employee = getFixtureUser("employee");
    expect(
      canOpenAnalyticsDrilldown(
        { personId: "person-sam" },
        (id) => canOpenPersonDetail(employee, id),
        false,
      ),
    ).toBe(false);
  });

  it("blocks team drill-down when team analytics are not allowed", () => {
    const employee = getFixtureUser("employee");
    expect(
      canOpenAnalyticsDrilldown(
        {},
        (id) => canOpenPersonDetail(employee, id),
        false,
      ),
    ).toBe(false);
  });

  it("allows team drill-down for managers with team dashboard", () => {
    const lead = getFixtureUser("lead");
    expect(
      canOpenAnalyticsDrilldown(
        {},
        (id) => canOpenPersonDetail(lead, id),
        true,
      ),
    ).toBe(true);
  });
});

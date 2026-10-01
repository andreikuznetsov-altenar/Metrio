import { describe, expect, it } from "vitest";
import { getFixtureUser } from "./currentUsers";
import { getDirectReports, getPerson } from "./people";

describe("org fixtures", () => {
  it("lead fixture has exactly five direct reports", () => {
    const user = getFixtureUser("lead");
    expect(user.team?.directReportIds).toHaveLength(5);
    expect(getDirectReports(user.team!)).toHaveLength(5);
    expect(getDirectReports(user.team!).every((p) => p.role === "employee")).toBe(
      true,
    );
  });

  it("director fixture has four direct reports without recursive expansion", () => {
    const user = getFixtureUser("director");
    expect(user.team?.directReportIds).toHaveLength(4);

    const reports = getDirectReports(user.team!);
    expect(reports.filter((p) => p.role === "lead")).toHaveLength(2);

    for (const report of reports) {
      expect(report.id).not.toBe(getPerson("person-jordan").id);
    }
  });

  it("employee fixture has no team", () => {
    const user = getFixtureUser("employee");
    expect(user.team).toBeUndefined();
  });
});

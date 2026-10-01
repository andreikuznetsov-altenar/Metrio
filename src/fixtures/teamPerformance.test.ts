import { describe, expect, it } from "vitest";
import { getFixtureUser } from "./currentUsers";
import { getTeamPerformanceSnapshot, getTeamSecondarySnapshot } from "./teamPerformance";

describe("teamPerformance fixtures", () => {
  it("builds snapshots only for direct report ids", () => {
    const lead = getFixtureUser("lead");
    const snapshot = getTeamPerformanceSnapshot(
      lead.team!.directReportIds,
      "30d",
      "team",
      0,
    );

    expect(snapshot.directReportIds).toEqual(lead.team!.directReportIds);
    expect(snapshot.workload).toHaveLength(5);
    expect(
      snapshot.workload.every((row) =>
        lead.team!.directReportIds.includes(row.personId),
      ),
    ).toBe(true);
  });

  it("does not include nested reports for director fixture", () => {
    const director = getFixtureUser("director");
    const snapshot = getTeamPerformanceSnapshot(
      director.team!.directReportIds,
      "30d",
      "team",
      0,
    );

    expect(snapshot.workload).toHaveLength(4);
    expect(snapshot.workload.map((row) => row.personId)).toEqual(
      director.team!.directReportIds,
    );
  });

  it("builds secondary views only for direct reports", () => {
    const lead = getFixtureUser("lead");
    const secondary = getTeamSecondarySnapshot(
      lead.team!.directReportIds,
      "30d",
      "team",
      0,
    );

    expect(secondary.people).toHaveLength(5);
    expect(secondary.radar.length).toBeGreaterThan(0);
    expect(secondary.deliveryRisk.length).toBeGreaterThan(0);
    expect(
      secondary.people.every((row) =>
        lead.team!.directReportIds.includes(row.personId),
      ),
    ).toBe(true);
    expect(
      secondary.deliveryRisk.every((row) =>
        lead.team!.directReportIds.includes(row.ownerId),
      ),
    ).toBe(true);
  });
});

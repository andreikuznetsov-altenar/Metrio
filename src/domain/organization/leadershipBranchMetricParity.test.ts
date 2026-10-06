import { describe, expect, it } from "vitest";
import { buildOrganizationModel } from "./buildOrganizationModel";
import { buildOrgRoleTeamDetection } from "../../fixtures/orgRoleProductionPathFixture";
import { buildCurrentUserFromTeamDetection } from "../currentUser/fromTeamDetection";
import { resolveAuthorizedPeopleScope } from "./authorizedPeopleScope";
import { rosterFromOrgResolution } from "./orgGraph";
import { branchMetricParityPairs } from "./leadershipBranchPerformanceRows";
import type { TeamSnapshot } from "../people/types";
import { testKpi, testWorkload } from "../testFixtures";

function person(id: string, supervisorId?: string) {
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: "",
      workEmail: `${id}@t.com`,
      jobTitle: "Designer",
      supervisorId,
    },
    availability: { state: "available" as const, label: "Available", isHoliday: false },
    workload: testWorkload({ level: "normal", activeCount: 2 }),
    performance: testKpi({ efficiencyIndex: 70, completedCount: 5, firstPassAcceptedCount: 4, backflowCount: 0 }),
    issues: [],
    ownedIssues: [],
  };
}

describe("leadership branch metric parity", () => {
  it("Dashboard teams and Performance rows share counts", () => {
    const org = buildOrgRoleTeamDetection("mom");
    const user = buildCurrentUserFromTeamDetection(org)!;
    const scope = resolveAuthorizedPeopleScope(
      org,
      user.person.role,
      [],
      user.orgHierarchy ?? null,
    );
    const ids = ["person-jordan", "person-06", "person-07", "person-01", "person-08", "person-09"];
    const snapshot: TeamSnapshot = {
      mode: "team",
      persons: ids.map((id) => person(id)),
      summary: { available: ids.length, onVacation: 0, vacationSoon: 0, highWorkload: 0, problematic: 0 },
    };
    const model = buildOrganizationModel({
      snapshot,
      params: {
        dateFrom: "2026-01-01",
        dateTo: "2026-03-01",
        targetReviewDays: 3,
        users: [],
        projects: [],
      },
      scope,
      feedback: { pendingResponseCount: 0, deliveryFailureCount: 0, preparedNotSent: 0 },
      orgHierarchy: user.orgHierarchy,
      bambooRoster: rosterFromOrgResolution(org),
    });
    const pairs = branchMetricParityPairs(model);
    expect(pairs.length).toBeGreaterThan(0);
    for (const pair of pairs) {
      expect(pair.teamPeopleCount).toBe(pair.perfPeopleCount);
      expect(pair.teamAttention).toBe(pair.perfDeliveryRisk);
    }
  });
});

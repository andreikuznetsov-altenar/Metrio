import { describe, expect, it } from "vitest";
import { buildOrgRoleTeamDetection } from "../../fixtures/orgRoleProductionPathFixture";
import type { OrgResolutionResult } from "../../services/bamboo/orgResolver";
import {
  NO_BAMBOO_MANAGER_COPY,
  resolveManagerEmployee,
  splitDepartmentLabel,
} from "./organizationIdentityModel";

describe("organizationIdentityModel", () => {
  it("splits department and team labels", () => {
    expect(splitDepartmentLabel("Agreegain / UX")).toEqual({
      department: "Agreegain",
      team: "UX",
    });
  });

  it("resolves manager from supervisor id in roster", () => {
    const org = buildOrgRoleTeamDetection("ic");
    const manager = resolveManagerEmployee(org);
    expect(manager?.id).toBe("person-sam");
    expect(manager?.workEmail).toContain("@");
  });

  it("prefers org.manager from Bamboo upstream resolution", () => {
    const org = buildOrgRoleTeamDetection("ic");
    const upstream: OrgResolutionResult = {
      ...org,
      manager: {
        id: "133",
        displayName: "Albert Urbanovich",
        firstName: "Albert",
        lastName: "Urbanovich",
        workEmail: "albert@fixture.test",
        jobTitle: "Director of UX Design",
        status: "Active",
      },
    };
    const manager = resolveManagerEmployee(upstream);
    expect(manager?.id).toBe("133");
    expect(manager?.jobTitle).toBe("Director of UX Design");
  });

  it("exposes canonical empty copy for no Bamboo supervisor", () => {
    expect(NO_BAMBOO_MANAGER_COPY).toBe("No manager is listed in BambooHR");
  });
});

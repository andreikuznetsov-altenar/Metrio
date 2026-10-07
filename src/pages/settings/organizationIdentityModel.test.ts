import { describe, expect, it } from "vitest";
import { buildOrgRoleTeamDetection } from "../../fixtures/orgRoleProductionPathFixture";
import {
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
});

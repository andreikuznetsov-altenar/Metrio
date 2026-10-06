import type { DevFixtureId } from "../domain/types";
import type { OrgHierarchyScope } from "../domain/organization/orgRole";

const DEV_DIRECTOR_HIERARCHY: OrgHierarchyScope = {
  currentUserId: "person-jordan",
  role: "manager_of_managers",
  directReportIds: ["person-06", "person-07", "person-08", "person-09"],
  directManagerReportIds: ["person-06", "person-08"],
  directIndividualContributorIds: ["person-07", "person-09"],
  descendantIds: [
    "person-jordan",
    "person-06",
    "person-07",
    "person-08",
    "person-09",
  ],
  topLevelManagerBranches: [
    {
      managerId: "person-06",
      descendantIds: ["person-06"],
      totalPeople: 1,
    },
    {
      managerId: "person-08",
      descendantIds: ["person-08"],
      totalPeople: 1,
    },
  ],
  maxDepthBelow: 1,
  graphWarnings: [],
};

const DEV_LEAD_HIERARCHY: OrgHierarchyScope = {
  currentUserId: "person-sam",
  role: "leaf_manager",
  directReportIds: ["person-01", "person-02", "person-03", "person-04", "person-05"],
  directManagerReportIds: [],
  directIndividualContributorIds: [
    "person-01",
    "person-02",
    "person-03",
    "person-04",
    "person-05",
  ],
  descendantIds: [
    "person-sam",
    "person-01",
    "person-02",
    "person-03",
    "person-04",
    "person-05",
  ],
  topLevelManagerBranches: [],
  maxDepthBelow: 1,
  graphWarnings: [],
};

const DEV_EMPLOYEE_HIERARCHY: OrgHierarchyScope = {
  currentUserId: "person-alex",
  role: "individual_contributor",
  directReportIds: [],
  directManagerReportIds: [],
  directIndividualContributorIds: [],
  descendantIds: ["person-alex"],
  topLevelManagerBranches: [],
  maxDepthBelow: 0,
  graphWarnings: [],
};

export function devOrgHierarchyForFixture(fixtureId: DevFixtureId): OrgHierarchyScope | null {
  switch (fixtureId) {
    case "director":
      return DEV_DIRECTOR_HIERARCHY;
    case "lead":
      return DEV_LEAD_HIERARCHY;
    case "employee":
      return DEV_EMPLOYEE_HIERARCHY;
    default:
      return null;
  }
}

import type { CurrentUser, DevFixtureId } from "../domain/types";
import { getPerson } from "./people";

const employeeUser: CurrentUser = {
  person: getPerson("person-alex"),
};

const leadUser: CurrentUser = {
  person: getPerson("person-sam"),
  jobTitle: "Design Lead",
  team: {
    leadId: "person-sam",
    directReportIds: [
      "person-01",
      "person-02",
      "person-03",
      "person-04",
      "person-05",
    ],
  },
};

const directorUser: CurrentUser = {
  person: getPerson("person-jordan"),
  team: {
    leadId: "person-jordan",
    directReportIds: [
      "person-06",
      "person-07",
      "person-08",
      "person-09",
    ],
  },
};

export const DEV_FIXTURES: Record<DevFixtureId, CurrentUser> = {
  employee: employeeUser,
  lead: leadUser,
  director: directorUser,
};

export function getFixtureUser(fixtureId: DevFixtureId): CurrentUser {
  return DEV_FIXTURES[fixtureId];
}

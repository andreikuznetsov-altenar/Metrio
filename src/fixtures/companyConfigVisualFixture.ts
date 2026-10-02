import { buildDefaultCompanyConfig } from "../domain/companyConfig/buildDefaultCompanyConfig";
import { applyCompanyConfigForDevAdmin } from "../domain/companyConfig/companyAdmin";

export function serializeCompanyConfigVisualFixtureForPlaywright(): string {
  const config = applyCompanyConfigForDevAdmin(buildDefaultCompanyConfig(), [
    "person-sam@visual.metrio",
  ]);
  const cache = {
    schemaVersion: 1,
    active: config,
    history: [],
  };
  return JSON.stringify(cache);
}

export function serializeCompanyConfigAdminEmailsForPlaywright(): string {
  return JSON.stringify(["person-sam@visual.metrio"]);
}

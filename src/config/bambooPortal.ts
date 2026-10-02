import { getBuildBambooPortalUrl } from "./product";

/** Employee time-off portal (Phase 21 / 24). */
export function bambooEmployeePortalUrl(): string {
  return getBuildBambooPortalUrl() || "https://www.bamboohr.com/";
}

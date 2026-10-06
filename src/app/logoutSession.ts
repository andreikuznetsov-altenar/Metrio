import { clearSessionMarker } from "./connectionStorage";
import { resetAvatarSession } from "../services/bamboo/bambooAvatarService";
import { resetOrgHierarchyCache } from "../domain/organization/orgHierarchyCache";

/** End the authenticated session but keep keychain credentials (reconnect without retyping secrets). */
export function logoutSession(): void {
  resetOrgHierarchyCache();
  resetAvatarSession();
  clearSessionMarker();
}

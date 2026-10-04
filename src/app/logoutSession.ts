import { clearSessionMarker } from "./connectionStorage";
import { resetAvatarSession } from "../services/bamboo/bambooAvatarService";

/** End the authenticated session but keep keychain credentials (reconnect without retyping secrets). */
export function logoutSession(): void {
  resetAvatarSession();
  clearSessionMarker();
}

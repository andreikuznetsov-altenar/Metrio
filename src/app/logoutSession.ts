import { clearSessionMarker } from "./connectionStorage";

/** End the authenticated session but keep keychain credentials (reconnect without retyping secrets). */
export function logoutSession(): void {
  clearSessionMarker();
}

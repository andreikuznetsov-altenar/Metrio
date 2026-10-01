import { clearSessionMarker } from "./connectionStorage";

type SessionInvalidator = () => void;

let sessionInvalidator: SessionInvalidator | null = null;

export function registerSessionInvalidator(fn: SessionInvalidator): void {
  sessionInvalidator = fn;
}

export function unregisterSessionInvalidator(fn: SessionInvalidator): void {
  if (sessionInvalidator === fn) {
    sessionInvalidator = null;
  }
}

export function invalidateAuthenticatedSession(): void {
  clearSessionMarker();
  sessionInvalidator?.();
}

import type { AppPreferences } from "../platform/preferences";

export type WorkspaceStatus = "idle" | "initializing" | "ready" | "error";

export const WORKSPACE_LOAD_ERROR_MESSAGE = "Couldn't load your workspace.";

export function validateWorkspacePreferences(
  prefs: AppPreferences,
): { ok: true } | { ok: false; message: string } {
  if (!prefs.setup?.completed) {
    return { ok: false, message: WORKSPACE_LOAD_ERROR_MESSAGE };
  }
  return { ok: true };
}

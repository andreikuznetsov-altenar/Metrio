import {
  getWorkEmail,
  loadPreferencesOutcome,
  type AppPreferences,
  type PreferencesLoadSource,
} from "../platform/preferences";
import {
  isAppConnected,
  readSavedConnection,
} from "./connectionStorage";

export type WorkspaceBootstrapStage =
  | "connection_marker"
  | "preferences_load"
  | "setup_completed"
  | "team_detection"
  | "jira_secret"
  | "bamboo_secret";

export interface WorkspaceBootstrapDiagnostic {
  connectionMarkerPresent: boolean;
  preferencesLoaded: boolean;
  preferencesSource?: PreferencesLoadSource;
  preferencesWarning?: string;
  setupCompleted?: boolean;
  teamDetectionPresent?: boolean;
  jiraSecretAvailable?: boolean;
  bambooSecretAvailable?: boolean;
  failedStage?: WorkspaceBootstrapStage;
  sanitizedReason?: string;
}

export type SessionBootstrapResult =
  | {
      kind: "ready";
      prefs: AppPreferences;
      diagnostic: WorkspaceBootstrapDiagnostic;
    }
  | {
      kind: "connection_required";
      reason: "no_marker" | "stale_session";
      diagnostic: WorkspaceBootstrapDiagnostic;
      preservedEmail?: string;
    }
  | {
      kind: "storage_error";
      message: string;
      diagnostic: WorkspaceBootstrapDiagnostic;
    };

export const SESSION_STORAGE_ERROR_MESSAGE =
  "We couldn't read your saved workspace. Try connecting again.";

export function logWorkspaceBootstrap(
  diagnostic: WorkspaceBootstrapDiagnostic,
): void {
  if (import.meta.env.DEV) {
    console.info("[metrio workspace bootstrap]", {
      connectionMarkerPresent: diagnostic.connectionMarkerPresent,
      preferencesLoaded: diagnostic.preferencesLoaded,
      preferencesSource: diagnostic.preferencesSource,
      setupCompleted: diagnostic.setupCompleted,
      teamDetectionPresent: diagnostic.teamDetectionPresent,
      jiraSecretAvailable: diagnostic.jiraSecretAvailable,
      bambooSecretAvailable: diagnostic.bambooSecretAvailable,
      failedStage: diagnostic.failedStage,
      sanitizedReason: diagnostic.sanitizedReason,
      hasPreferencesWarning: Boolean(diagnostic.preferencesWarning),
    });
  }
}

export async function bootstrapProductionSession(): Promise<SessionBootstrapResult> {
  const connectionMarkerPresent = isAppConnected();
  const diagnostic: WorkspaceBootstrapDiagnostic = {
    connectionMarkerPresent,
    preferencesLoaded: false,
  };

  if (!connectionMarkerPresent) {
    diagnostic.failedStage = "connection_marker";
    return {
      kind: "connection_required",
      reason: "no_marker",
      diagnostic,
    };
  }

  const saved = await readSavedConnection();
  diagnostic.jiraSecretAvailable = saved?.hasJiraToken ?? false;
  diagnostic.bambooSecretAvailable = saved?.hasBambooApiKey ?? false;

  const outcome = await loadPreferencesOutcome();
  if (!outcome.ok) {
    diagnostic.failedStage = "preferences_load";
    diagnostic.sanitizedReason = outcome.reason;
    logWorkspaceBootstrap(diagnostic);
    return {
      kind: "storage_error",
      message: SESSION_STORAGE_ERROR_MESSAGE,
      diagnostic,
    };
  }

  diagnostic.preferencesLoaded = true;
  diagnostic.preferencesSource = outcome.source;
  diagnostic.preferencesWarning = outcome.warning;
  diagnostic.setupCompleted = outcome.prefs.setup?.completed ?? false;
  diagnostic.teamDetectionPresent = Boolean(outcome.prefs.teamDetection);

  const preservedEmail =
    saved?.workEmail?.trim() ||
    getWorkEmail(outcome.prefs) ||
    undefined;

  if (outcome.source === "default" || outcome.warning) {
    diagnostic.failedStage = "preferences_load";
    diagnostic.sanitizedReason =
      outcome.warning ?? "Workspace preferences are missing.";
    logWorkspaceBootstrap(diagnostic);
    return {
      kind: "connection_required",
      reason: "stale_session",
      diagnostic,
      preservedEmail,
    };
  }

  if (!outcome.prefs.setup?.completed) {
    diagnostic.failedStage = "setup_completed";
    diagnostic.sanitizedReason = "Workspace setup is incomplete.";
    logWorkspaceBootstrap(diagnostic);
    return {
      kind: "connection_required",
      reason: "stale_session",
      diagnostic,
      preservedEmail,
    };
  }

  if (!saved?.hasJiraToken) {
    diagnostic.failedStage = "jira_secret";
    logWorkspaceBootstrap(diagnostic);
    return {
      kind: "connection_required",
      reason: "stale_session",
      diagnostic,
      preservedEmail,
    };
  }

  if (!saved?.hasBambooApiKey) {
    diagnostic.failedStage = "bamboo_secret";
    logWorkspaceBootstrap(diagnostic);
    return {
      kind: "connection_required",
      reason: "stale_session",
      diagnostic,
      preservedEmail,
    };
  }

  logWorkspaceBootstrap(diagnostic);
  return {
    kind: "ready",
    prefs: outcome.prefs,
    diagnostic,
  };
}

export function isPersistedWorkspaceReady(
  outcome: Extract<
    Awaited<ReturnType<typeof loadPreferencesOutcome>>,
    { ok: true }
  >,
): boolean {
  return outcome.source === "file" && outcome.prefs.setup?.completed === true;
}

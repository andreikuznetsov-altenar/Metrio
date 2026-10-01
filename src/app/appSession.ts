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
import { bootLog } from "./bootDiagnostics";

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
  bootLog(
    "WB",
    [
      `marker=${diagnostic.connectionMarkerPresent}`,
      `prefsLoaded=${diagnostic.preferencesLoaded}`,
      diagnostic.preferencesSource
        ? `source=${diagnostic.preferencesSource}`
        : null,
      diagnostic.setupCompleted !== undefined
        ? `setupCompleted=${diagnostic.setupCompleted}`
        : null,
      diagnostic.teamDetectionPresent !== undefined
        ? `teamDetection=${diagnostic.teamDetectionPresent}`
        : null,
      diagnostic.jiraSecretAvailable !== undefined
        ? `jiraSecret=${diagnostic.jiraSecretAvailable}`
        : null,
      diagnostic.bambooSecretAvailable !== undefined
        ? `bambooSecret=${diagnostic.bambooSecretAvailable}`
        : null,
      diagnostic.failedStage ? `failedStage=${diagnostic.failedStage}` : null,
      diagnostic.sanitizedReason
        ? `reason=${diagnostic.sanitizedReason.slice(0, 120)}`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export async function bootstrapProductionSession(): Promise<SessionBootstrapResult> {
  const connectionMarkerPresent = isAppConnected();
  const diagnostic: WorkspaceBootstrapDiagnostic = {
    connectionMarkerPresent,
    preferencesLoaded: false,
  };

  if (!connectionMarkerPresent) {
    diagnostic.failedStage = "connection_marker";
    bootLog("07", "connection marker=false");
    return {
      kind: "connection_required",
      reason: "no_marker",
      diagnostic,
    };
  }

  bootLog("07", "connection marker=true");
  bootLog("08", "saved connection read started");
  const saved = await readSavedConnection();
  bootLog(
    "08",
    `saved connection read finished hasConfig=${Boolean(saved)} jiraSecret=${Boolean(saved?.hasJiraToken)} bambooSecret=${Boolean(saved?.hasBambooApiKey)}`,
  );
  diagnostic.jiraSecretAvailable = saved?.hasJiraToken ?? false;
  diagnostic.bambooSecretAvailable = saved?.hasBambooApiKey ?? false;

  bootLog("09", "preferences invoke started");
  const outcome = await loadPreferencesOutcome();
  bootLog(
    "10",
    outcome.ok
      ? `preferences invoke finished source=${outcome.source} setupCompleted=${outcome.prefs.setup?.completed ?? false}`
      : `preferences invoke failed stage=${outcome.stage}`,
  );
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

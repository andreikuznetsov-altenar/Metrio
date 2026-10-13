import type { BuildChannel } from "../config/build";
import type { Update } from "@tauri-apps/plugin-updater";
import {
  evaluateManifestUpdate,
  parseUpdateManifest,
  type StaticUpdateManifest,
} from "../domain/updates/updateManifest";

export type UpdateCheckStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "error";

export interface UpdateCheckResult {
  status: UpdateCheckStatus;
  currentVersion: string;
  availableVersion?: string;
  notes?: string;
  message?: string;
  nativeUpdate?: Update;
}

export interface UpdateInstallProgress {
  phase: "idle" | "downloading" | "installing" | "done" | "error";
  percent: number | null;
  message?: string;
}

const LAST_BACKGROUND_CHECK_KEY = "metrio-update-last-check";

/** First automatic check runs shortly after startup, then on this cadence while the app stays open. */
export const UPDATE_STARTUP_CHECK_DELAY_MS = 12_000;
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function isUpdaterEnabledForChannel(channel: BuildChannel): boolean {
  return channel === "production";
}

export function markBackgroundCheckRan(at = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKGROUND_CHECK_KEY, at.toISOString());
  } catch {
    // ignore quota errors
  }
}

export interface UpdateCheckTimers {
  setTimeout: (handler: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  setInterval: (handler: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
}

/**
 * Non-blocking automatic checks: once shortly after startup, then every
 * `UPDATE_CHECK_INTERVAL_MS`. A failing check never throws into the app.
 */
export function scheduleUpdateChecks(
  runCheck: () => Promise<void>,
  timers: UpdateCheckTimers = {
    setTimeout: (h, ms) => window.setTimeout(h, ms),
    clearTimeout: (id) => window.clearTimeout(id as number),
    setInterval: (h, ms) => window.setInterval(h, ms),
    clearInterval: (id) => window.clearInterval(id as number),
  },
): () => void {
  const safeRun = () => {
    void runCheck().catch(() => undefined);
  };
  const startup = timers.setTimeout(safeRun, UPDATE_STARTUP_CHECK_DELAY_MS);
  const interval = timers.setInterval(safeRun, UPDATE_CHECK_INTERVAL_MS);
  return () => {
    timers.clearTimeout(startup);
    timers.clearInterval(interval);
  };
}

export type UpdateErrorPhase = "check" | "install";

/** Understandable, non-sensitive copy for updater failures. */
export function describeUpdateError(error: unknown, phase: UpdateErrorPhase): string {
  const reason = error instanceof Error ? error.message : String(error ?? "");
  if (/signature|verify|pubkey/i.test(reason)) {
    return "Update couldn't be verified.";
  }
  if (phase === "install") {
    return "Update couldn't be installed.";
  }
  if (/valid release json|release json/i.test(reason)) {
    return "Update information isn't available right now. Try again later.";
  }
  if (/network|dns|offline|timed? ?out|connect|unreachable|resolve|fetch|request|http/i.test(reason)) {
    return "Couldn't reach the update server. Check your connection and try again.";
  }
  if (/json|parse|invalid|malformed|manifest/i.test(reason)) {
    return "Update information was invalid. Try again later.";
  }
  // Includes missing platform entries: a failure is never presented as "no update".
  return "Update information isn't available right now. Try again later.";
}

export type UpdateErrorCategory =
  | "signature"
  | "network"
  | "manifest_unavailable"
  | "target_unsupported"
  | "manifest_invalid"
  | "unknown";

/** Coarse, non-sensitive classification of a raw updater error for diagnostics. */
export function categorizeUpdateError(error: unknown): UpdateErrorCategory {
  const reason = error instanceof Error ? error.message : String(error ?? "");
  if (/signature|verify|pubkey/i.test(reason)) return "signature";
  if (/valid release json|release json/i.test(reason)) return "manifest_unavailable";
  if (/network|dns|offline|timed? ?out|connect|unreachable|resolve|fetch|request|http/i.test(reason)) {
    return "network";
  }
  if (/platform|target|unsupported/i.test(reason)) return "target_unsupported";
  if (/json|parse|invalid|malformed|manifest/i.test(reason)) return "manifest_invalid";
  return "unknown";
}

/** Same endpoint as `plugins.updater.endpoints` in tauri.conf.json (asserted by a test). */
export const UPDATE_ENDPOINT =
  "https://github.com/andreikuznetsov-altenar/Metrio/releases/latest/download/latest.json";

export interface UpdateDiagnostic {
  at: string;
  phase: UpdateErrorPhase;
  category: UpdateErrorCategory;
  currentVersion: string;
  endpoint: string;
  target: string | null;
  /** Raw plugin error, truncated. Never contains keys or credentials. */
  rawError: string;
}

const UPDATE_DIAGNOSTIC_KEY = "metrio-update-diagnostic";

export function buildUpdateDiagnostic(input: {
  error: unknown;
  phase: UpdateErrorPhase;
  currentVersion: string;
  target: string | null;
  at?: Date;
}): UpdateDiagnostic {
  const raw = input.error instanceof Error ? input.error.message : String(input.error ?? "");
  return {
    at: (input.at ?? new Date()).toISOString(),
    phase: input.phase,
    category: categorizeUpdateError(input.error),
    currentVersion: input.currentVersion,
    endpoint: UPDATE_ENDPOINT,
    target: input.target,
    rawError: raw.slice(0, 500),
  };
}

/** Keeps the last failure for support; normal UI only ever shows the short message. */
export function recordUpdateDiagnostic(diagnostic: UpdateDiagnostic): void {
  console.warn("[metrio-updater]", JSON.stringify(diagnostic));
  try {
    localStorage.setItem(UPDATE_DIAGNOSTIC_KEY, JSON.stringify(diagnostic));
  } catch {
    // ignore quota / unavailable storage
  }
}

export function readUpdateDiagnostic(): UpdateDiagnostic | null {
  try {
    const raw = localStorage.getItem(UPDATE_DIAGNOSTIC_KEY);
    return raw ? (JSON.parse(raw) as UpdateDiagnostic) : null;
  } catch {
    return null;
  }
}

async function readUpdaterTarget(): Promise<string | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const target = await invoke<unknown>("app_get_updater_target");
    return typeof target === "string" ? target : null;
  } catch {
    return null;
  }
}

export async function fetchUpdateManifest(
  endpoint: string,
  fetchImpl: typeof fetch = fetch,
): Promise<StaticUpdateManifest> {
  const response = await fetchImpl(endpoint, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`manifest_http_${response.status}`);
  }
  const json = (await response.json()) as unknown;
  const manifest = parseUpdateManifest(json);
  if (!manifest) {
    throw new Error("manifest_invalid");
  }
  return manifest;
}

export function checkUpdateFromManifest(
  manifest: StaticUpdateManifest,
  currentVersion: string,
): UpdateCheckResult {
  const evaluated = evaluateManifestUpdate(manifest, currentVersion);
  if (!evaluated.available) {
    return { status: "up-to-date", currentVersion };
  }
  return {
    status: "available",
    currentVersion,
    availableVersion: evaluated.version,
    notes: evaluated.notes,
  };
}

export async function checkForUpdatesWithManifest(
  currentVersion: string,
  endpoint: string,
  fetchImpl?: typeof fetch,
): Promise<UpdateCheckResult> {
  try {
    const manifest = await fetchUpdateManifest(endpoint, fetchImpl);
    return checkUpdateFromManifest(manifest, currentVersion);
  } catch {
    return {
      status: "error",
      currentVersion,
      message: "Unable to check for updates.",
    };
  }
}

export async function checkForUpdatesNative(
  currentVersion: string,
): Promise<UpdateCheckResult> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    // `null` is the plugin's success result for "no newer version" — not an error.
    if (!update) {
      return { status: "up-to-date", currentVersion };
    }
    return {
      status: "available",
      currentVersion,
      availableVersion: update.version,
      notes: update.body ?? "",
      nativeUpdate: update,
    };
  } catch (error) {
    recordUpdateDiagnostic(
      buildUpdateDiagnostic({
        error,
        phase: "check",
        currentVersion,
        target: await readUpdaterTarget(),
      }),
    );
    return {
      status: "error",
      currentVersion,
      message: describeUpdateError(error, "check"),
    };
  }
}

export async function installNativeUpdate(
  update: Update,
  onProgress?: (progress: UpdateInstallProgress) => void,
): Promise<void> {
  onProgress?.({ phase: "downloading", percent: null });
  try {
    await update.downloadAndInstall((event) => {
      const payload = event as {
        event?: string;
        data?: { chunkLength?: number; contentLength?: number };
      };
      if (payload.event === "Progress") {
        const { chunkLength, contentLength } = payload.data ?? {};
        if (
          typeof chunkLength === "number" &&
          typeof contentLength === "number" &&
          contentLength > 0
        ) {
          const percent = Math.min(
            100,
            Math.round((chunkLength / contentLength) * 100),
          );
          onProgress?.({ phase: "downloading", percent });
        } else {
          onProgress?.({ phase: "downloading", percent: null });
        }
      } else if (payload.event === "Started") {
        onProgress?.({ phase: "downloading", percent: null });
      } else if (payload.event === "Finished") {
        onProgress?.({ phase: "installing", percent: 100 });
      }
    });
    onProgress?.({ phase: "done", percent: 100 });
  } catch (error) {
    const message = describeUpdateError(error, "install");
    onProgress?.({ phase: "error", percent: null, message });
    throw error;
  }
}

export async function relaunchAfterUpdate(): Promise<void> {
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

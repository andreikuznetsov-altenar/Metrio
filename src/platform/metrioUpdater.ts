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

export function isUpdaterEnabledForChannel(channel: BuildChannel): boolean {
  return channel === "production";
}

export function shouldRunDailyBackgroundCheck(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(LAST_BACKGROUND_CHECK_KEY);
    if (!raw) return true;
    const last = Date.parse(raw);
    if (Number.isNaN(last)) return true;
    return now - last >= 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function markBackgroundCheckRan(at = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKGROUND_CHECK_KEY, at.toISOString());
  } catch {
    // ignore quota errors
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
    const reason =
      error instanceof Error ? error.message : "updater_check_failed";
    if (/signature|verify|pubkey/i.test(reason)) {
      return {
        status: "error",
        currentVersion,
        message: "Update couldn't be verified.",
      };
    }
    return {
      status: "error",
      currentVersion,
      message: "Unable to check for updates.",
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
    const reason =
      error instanceof Error ? error.message : "updater_install_failed";
    if (/signature|verify|pubkey/i.test(reason)) {
      onProgress?.({
        phase: "error",
        percent: null,
        message: "Update couldn't be verified.",
      });
      throw new Error("signature_verification_failed");
    }
    onProgress?.({
      phase: "error",
      percent: null,
      message: "Update couldn't be installed.",
    });
    throw error;
  }
}

export async function relaunchAfterUpdate(): Promise<void> {
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

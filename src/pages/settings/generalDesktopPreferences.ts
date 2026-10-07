import { invoke } from "@tauri-apps/api/core";
import {
  applyLaunchAtLogin,
  isLaunchAtLoginEnabled,
} from "../../platform/autostart";
import type { AppPreferences } from "../../platform/preferences";
export type PersistPreferences = (
  next: AppPreferences,
  toastMessage?: string,
) => Promise<void>;

export async function reconcileLaunchAtLoginPreference(
  prefs: AppPreferences,
  onPersist: PersistPreferences,
): Promise<void> {
  try {
    const osEnabled = await isLaunchAtLoginEnabled();
    if (osEnabled !== prefs.general.launchAtLogin) {
      await onPersist(
        {
          ...prefs,
          general: { ...prefs.general, launchAtLogin: osEnabled },
        },
        "",
      );
    }
  } catch {
    // Autostart plugin unavailable outside desktop host.
  }
}

export async function setLaunchAtLoginPreference(
  prefs: AppPreferences,
  enabled: boolean,
  onPersist: PersistPreferences,
  onError: (message: string) => void,
): Promise<void> {
  if (enabled === prefs.general.launchAtLogin) {
    return;
  }
  try {
    await applyLaunchAtLogin(enabled);
  } catch (e) {
    onError(e instanceof Error ? e.message : "Could not update launch at login.");
    return;
  }
  await onPersist(
    {
      ...prefs,
      general: { ...prefs.general, launchAtLogin: enabled },
    },
    "",
  );
}

export async function setKeepRunningInTrayPreference(
  prefs: AppPreferences,
  enabled: boolean,
  onPersist: PersistPreferences,
  onError: (message: string) => void,
): Promise<void> {
  if (enabled === prefs.general.keepRunningInTray) {
    return;
  }
  const next: AppPreferences = {
    ...prefs,
    general: { ...prefs.general, keepRunningInTray: enabled },
  };
  try {
    await invoke("set_keep_running_in_tray", { enabled });
    await onPersist(next, "");
  } catch (e) {
    onError(
      e instanceof Error ? e.message : "Could not update menu bar mode.",
    );
  }
}

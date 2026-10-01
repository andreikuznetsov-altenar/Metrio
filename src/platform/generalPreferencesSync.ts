import { invoke } from "@tauri-apps/api/core";
import { applyLaunchAtLogin } from "./autostart";
import type { AppPreferences } from "./preferences";

export async function syncGeneralPreferencesToNative(
  general: AppPreferences["general"],
): Promise<void> {
  try {
    await applyLaunchAtLogin(general.launchAtLogin);
  } catch {
    // Autostart plugin unavailable outside desktop host.
  }
  try {
    await invoke("set_keep_running_in_tray", {
      enabled: general.keepRunningInTray,
    });
  } catch {
    // Native lifecycle command unavailable outside desktop host.
  }
}

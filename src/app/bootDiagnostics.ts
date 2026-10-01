import { invoke } from "@tauri-apps/api/core";
import { writeLog } from "../platform/logger";

let lastBootStage = "00";

export function getLastBootStage(): string {
  return lastBootStage;
}

export function bootLog(step: string, detail?: string): void {
  lastBootStage = step;
  const message = detail ? `BOOT ${step} ${detail}` : `BOOT ${step}`;
  if (typeof window !== "undefined") {
    (window as MetrioBootWindow).__METRIO_BOOT_STAGE = step;
  }
  void writeLog("info", "app", "boot", message);
}

interface MetrioBootWindow extends Window {
  __METRIO_BOOT_STAGE?: string;
}

export async function bootLogBuildIdentity(): Promise<void> {
  try {
    const info = await invoke<{
      version: string;
      commit: string;
      channel: string;
      product_name: string;
    }>("app_get_build_info");
    bootLog(
      "00",
      `version=${info.version} commit=${info.commit} channel=${info.channel} product=${info.product_name}`,
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "build_info_unavailable";
    bootLog("00", `build_info_failed reason=${reason}`);
  }
}

export function bootLogError(step: string, error: unknown): void {
  const reason =
    error instanceof Error ? error.message : typeof error === "string" ? error : "unknown";
  bootLog(step, `error=${reason.slice(0, 200)}`);
}

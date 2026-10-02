import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { getBuildInfo, type BuildInfo } from "../config/build";
import { getUpdateManifestUrl } from "../config/updates";
import {
  checkForUpdatesNative,
  checkForUpdatesWithManifest,
  installNativeUpdate,
  isUpdaterEnabledForChannel,
  markBackgroundCheckRan,
  relaunchAfterUpdate,
  shouldRunDailyBackgroundCheck,
  type UpdateCheckResult,
  type UpdateInstallProgress,
} from "../platform/metrioUpdater";
import type { Update } from "@tauri-apps/plugin-updater";

interface UpdateContextValue {
  buildInfo: BuildInfo;
  checkResult: UpdateCheckResult;
  installProgress: UpdateInstallProgress;
  updaterEnabled: boolean;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

async function loadNativeBuildInfo(): Promise<BuildInfo> {
  const fallback = getBuildInfo();
  try {
    const info = await invoke<{
      version: string;
      commit: string;
      channel: string;
      product_name: string;
    }>("app_get_build_info");
    return {
      version: info.version,
      commit: info.commit,
      channel:
        info.channel === "production" || info.channel === "internal-beta"
          ? info.channel
          : "development",
      productName: info.product_name,
    };
  } catch {
    return fallback;
  }
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [buildInfo, setBuildInfo] = useState<BuildInfo>(getBuildInfo());
  const [checkResult, setCheckResult] = useState<UpdateCheckResult>({
    status: "idle",
    currentVersion: getBuildInfo().version,
  });
  const [installProgress, setInstallProgress] = useState<UpdateInstallProgress>({
    phase: "idle",
    percent: null,
  });
  const nativeUpdateRef = useRef<Update | null>(null);

  const updaterEnabled = isUpdaterEnabledForChannel(buildInfo.channel);

  useEffect(() => {
    void loadNativeBuildInfo().then((info) => {
      setBuildInfo(info);
      setCheckResult((prev) => ({ ...prev, currentVersion: info.version }));
    });
  }, []);

  const runCheck = useCallback(async () => {
    const info = await loadNativeBuildInfo();
    setBuildInfo(info);
    if (!isUpdaterEnabledForChannel(info.channel)) {
      setCheckResult({
        status: "up-to-date",
        currentVersion: info.version,
        message: "Updates are disabled in development builds.",
      });
      return;
    }

    setCheckResult({ status: "checking", currentVersion: info.version });
    const manifestUrl = getUpdateManifestUrl(info.channel);
    let result: UpdateCheckResult;
    try {
      result = await checkForUpdatesNative(info.version);
      nativeUpdateRef.current =
        result.status === "available" ? (result.nativeUpdate ?? null) : null;
      if (result.status === "error" && manifestUrl) {
        result = await checkForUpdatesWithManifest(info.version, manifestUrl);
        nativeUpdateRef.current = null;
      }
    } catch {
      if (manifestUrl) {
        result = await checkForUpdatesWithManifest(info.version, manifestUrl);
        nativeUpdateRef.current = null;
      } else {
        result = {
          status: "error",
          currentVersion: info.version,
          message: "Unable to check for updates.",
        };
      }
    }
    setCheckResult(result);
    markBackgroundCheckRan();
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    if (!updaterEnabled) return;
    if (!shouldRunDailyBackgroundCheck()) return;
    const timer = window.setTimeout(() => {
      void runCheck();
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [runCheck, updaterEnabled]);

  const installUpdate = useCallback(async () => {
    const update = nativeUpdateRef.current;
    if (!update) {
      setInstallProgress({
        phase: "error",
        percent: null,
        message: "No verified update package is ready to install.",
      });
      return;
    }
    setInstallProgress({ phase: "downloading", percent: null });
    try {
      await installNativeUpdate(update, setInstallProgress);
      setInstallProgress({ phase: "done", percent: 100 });
      await relaunchAfterUpdate();
    } catch {
      setInstallProgress({
        phase: "error",
        percent: null,
        message: "Update couldn't be installed.",
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      buildInfo,
      checkResult,
      installProgress,
      updaterEnabled,
      checkForUpdates: runCheck,
      installUpdate,
    }),
    [buildInfo, checkResult, installProgress, updaterEnabled, runCheck, installUpdate],
  );

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

export function useMetrioUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) {
    throw new Error("useMetrioUpdate must be used within UpdateProvider");
  }
  return ctx;
}

export function useOptionalMetrioUpdate(): UpdateContextValue | null {
  return useContext(UpdateContext);
}

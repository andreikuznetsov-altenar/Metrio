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
import { getBuildInfo, isUpdaterAvailableForBuild, type BuildInfo } from "../config/build";
import {
  checkForUpdatesNative,
  installNativeUpdate,
  describeUpdateError,
  markBackgroundCheckRan,
  relaunchAfterUpdate,
  scheduleUpdateChecks,
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
  /** True while an available update should be offered (not dismissed with "Later"). */
  promptVisible: boolean;
  dismissPrompt: () => void;
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
  const [promptDismissed, setPromptDismissed] = useState(false);
  const nativeUpdateRef = useRef<Update | null>(null);

  const updaterEnabled = isUpdaterAvailableForBuild(buildInfo);

  useEffect(() => {
    void loadNativeBuildInfo().then((info) => {
      setBuildInfo(info);
      setCheckResult((prev) => ({ ...prev, currentVersion: info.version }));
    });
  }, []);

  const runCheck = useCallback(async () => {
    const info = await loadNativeBuildInfo();
    setBuildInfo(info);
    if (!isUpdaterAvailableForBuild(info)) {
      setCheckResult({
        status: "idle",
        currentVersion: info.version,
        message: "Updates are unavailable in this review build.",
      });
      return;
    }

    setCheckResult({ status: "checking", currentVersion: info.version });
    // The Tauri updater is the single source of truth: a failed check is a failed
    // check, never silently re-evaluated through a second, weaker code path.
    const result = await checkForUpdatesNative(info.version);
    nativeUpdateRef.current =
      result.status === "available" ? (result.nativeUpdate ?? null) : null;
    if (result.status === "available") {
      // A fresh check that finds an update offers it again, even after "Later".
      setPromptDismissed(false);
    }
    setCheckResult(result);
    markBackgroundCheckRan();
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    if (!updaterEnabled) return;
    return scheduleUpdateChecks(runCheck);
  }, [runCheck, updaterEnabled]);

  const dismissPrompt = useCallback(() => setPromptDismissed(true), []);

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
    } catch (error) {
      setInstallProgress({
        phase: "error",
        percent: null,
        message: describeUpdateError(error, "install"),
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
      promptVisible: updaterEnabled && checkResult.status === "available" && !promptDismissed,
      dismissPrompt,
    }),
    [
      buildInfo,
      checkResult,
      installProgress,
      updaterEnabled,
      runCheck,
      installUpdate,
      promptDismissed,
      dismissPrompt,
    ],
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

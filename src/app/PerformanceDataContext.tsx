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
import type { PerformanceReviewTarget } from "../domain/performance";
import {
  buildPerformanceDatasetKey,
  dateRangeKeyFromPerformanceRange,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import type { PerformanceAudience } from "../domain/performance/reportParams";
import {
  isLatestPerformanceRequest,
  PERFORMANCE_OVERLAY_MIN_MS,
} from "./performanceLoadGuard";
import {
  derivePerformanceUiState,
  type PerformanceUiState,
} from "./performanceUiState";
import { useMinimumVisibleDuration } from "./useMinimumVisibleDuration";
import { fetchPerformanceData } from "../services/performance/performanceDataService";
import {
  applyPerformanceRefreshSideEffects,
  markPerformanceIntegrationsStale,
} from "../services/performance/performanceRefreshSideEffects";
import type { PerformanceFetchResult } from "../services/performance/performanceTypes";
import {
  buildPerformanceViewModels,
  type PerformanceViewModels,
} from "../services/performance/performanceViewModel";
import { registerCoalescedBackgroundRefresh } from "../services/refresh/backgroundRefresh";
import { createCoalescedRefresh } from "../services/refresh/refreshCoordinator";
import {
  installKpiReconciliationDevTools,
  registerKpiReconciliationDataSource,
} from "../domain/analytics/kpiReconciliationDev";

export type PerformanceLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "refreshing"
  | "partial"
  | "error";

export interface PerformanceDataContextValue {
  status: PerformanceLoadStatus;
  data: PerformanceFetchResult | null;
  viewModels: PerformanceViewModels | null;
  loadingMessage: string | null;
  errorMessage: string | null;
  stale: boolean;
  refresh: () => Promise<void>;
  refreshing: boolean;
  contentLoadingActive: boolean;
  contentOverlayVisible: boolean;
  performanceControlsDisabled: boolean;
  uiState: PerformanceUiState;
  longLoadingMessage: string | null;
}

const PerformanceDataContext =
  createContext<PerformanceDataContextValue | null>(null);

function errorMessageFromError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/bamboo/i.test(message)) {
    return "Couldn't refresh Bamboo data.";
  }
  if (/jira/i.test(message)) {
    return "Couldn't refresh Jira data.";
  }
  return "Couldn't refresh performance data.";
}

export interface PerformanceDataProviderProps {
  /** When false, skip fetch lifecycle (disconnected / gated shell). */
  enabled: boolean;
  /** Visible loading overlay only on Performance surfaces. */
  showLoadingOverlay?: boolean;
  dateRange: PerformanceDateRange;
  reviewTarget: PerformanceReviewTarget;
  audience: PerformanceAudience;
  selfPersonId: string;
  managerTeamTray: boolean;
  children: ReactNode;
}

type LoadMode = "initial" | "refresh" | "silent";

export function PerformanceDataProvider({
  enabled,
  showLoadingOverlay = true,
  dateRange,
  reviewTarget,
  audience,
  selfPersonId,
  managerTeamTray,
  children,
}: PerformanceDataProviderProps) {
  const [data, setData] = useState<PerformanceFetchResult | null>(null);
  const [viewModels, setViewModels] = useState<PerformanceViewModels | null>(
    null,
  );
  const [status, setStatus] = useState<PerformanceLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [longLoadingMessage, setLongLoadingMessage] = useState<string | null>(
    null,
  );
  const dataRef = useRef(data);
  const viewModelsRef = useRef(viewModels);
  const managerTeamTrayRef = useRef(managerTeamTray);
  const requestSeqRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const datasetKeyRef = useRef<string | null>(null);
  dataRef.current = data;
  viewModelsRef.current = viewModels;
  managerTeamTrayRef.current = managerTeamTray;

  useEffect(() => {
    installKpiReconciliationDevTools();
  }, []);

  const contentLoadingActive =
    showLoadingOverlay && enabled && (status === "loading" || status === "refreshing");
  const contentOverlayVisible = useMinimumVisibleDuration(
    contentLoadingActive,
    PERFORMANCE_OVERLAY_MIN_MS,
  );
  const performanceControlsDisabled =
    contentLoadingActive || contentOverlayVisible;

  const uiState = derivePerformanceUiState({ status, viewModels, stale });

  useEffect(() => {
    if (!contentLoadingActive) {
      setLongLoadingMessage(null);
      return;
    }
    setLongLoadingMessage(null);
    const timer = window.setTimeout(() => {
      setLongLoadingMessage("Still loading Jira and Bamboo data…");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [contentLoadingActive, dateRange, reviewTarget, audience]);

  const load = useCallback(
    async (mode: LoadMode) => {
      if (!enabled) {
        return;
      }
      const requestId = ++requestSeqRef.current;
      const hasData = dataRef.current != null;
      const showOverlay = mode !== "silent";
      if (showOverlay) {
        setStatus(hasData ? "refreshing" : "loading");
        if (mode === "refresh" && hasData) {
          setStale(false);
        }
      }
      setErrorMessage(null);

      try {
        const next = await fetchPerformanceData(
          dateRange,
          reviewTarget,
          audience,
        );
        if (!isLatestPerformanceRequest(requestId, requestSeqRef.current)) {
          return;
        }
        const models = buildPerformanceViewModels(
          next,
          selfPersonId,
          dateRangeKeyFromPerformanceRange(dateRange),
          dateRange,
          reviewTarget,
        );
        setData(next);
        setViewModels(models);
        registerKpiReconciliationDataSource(next, reviewTarget);
        const partial =
          next.partialWarnings.length > 0 || Boolean(models.statusMessage);
        setStatus(partial ? "partial" : "ready");
        setStale(false);
        setErrorMessage(null);
        await applyPerformanceRefreshSideEffects(next, {
          selfPersonId,
        });
      } catch (error) {
        if (!isLatestPerformanceRequest(requestId, requestSeqRef.current)) {
          return;
        }
        const message = errorMessageFromError(error);
        setErrorMessage(message);
        if (dataRef.current) {
          setStale(true);
          setStatus("partial");
          await markPerformanceIntegrationsStale({
            jira: /jira/i.test(message),
            bamboo: /bamboo/i.test(message),
          });
        } else if (showOverlay) {
          setStatus("error");
        }
      }
    },
    [dateRange, reviewTarget, audience, enabled, selfPersonId],
  );

  const coalescedLoadRef = useRef(createCoalescedRefresh(() => load("refresh")));

  useEffect(() => {
    coalescedLoadRef.current = createCoalescedRefresh(() => load("refresh"));
  }, [load]);

  const coalescedSilentRef = useRef(createCoalescedRefresh(() => load("silent")));

  useEffect(() => {
    coalescedSilentRef.current = createCoalescedRefresh(() => load("silent"));
  }, [load]);

  const refresh = useCallback(async () => {
    await coalescedLoadRef.current();
  }, []);

  const datasetKey = useMemo(
    () =>
      buildPerformanceDatasetKey({
        dateRange,
        reviewTarget,
        audience,
        selfPersonId,
      }),
    [audience, dateRange, reviewTarget, selfPersonId],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const keyChanged = datasetKeyRef.current !== datasetKey;

    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      datasetKeyRef.current = datasetKey;
      void load("initial");
      return;
    }

    if (keyChanged) {
      datasetKeyRef.current = datasetKey;
      void coalescedLoadRef.current();
    }
  }, [datasetKey, enabled, load]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let disposed = false;
    let unregister: (() => void) | undefined;

    void (async () => {
      try {
        const unsub = await registerCoalescedBackgroundRefresh(async () => {
          await coalescedSilentRef.current();
        });
        if (disposed) {
          unsub();
          return;
        }
        unregister = unsub;
      } catch {
        // Tauri event API unavailable outside the desktop host.
      }
    })();

    return () => {
      disposed = true;
      unregister?.();
    };
  }, [enabled]);

  const loadingMessage =
    status === "loading" || status === "refreshing"
      ? "Fetching team data…"
      : null;

  const refreshing = status === "refreshing";

  const value = useMemo(
    (): PerformanceDataContextValue => ({
      status,
      data,
      viewModels,
      loadingMessage,
      errorMessage,
      stale,
      refresh,
      refreshing,
      contentLoadingActive,
      contentOverlayVisible,
      performanceControlsDisabled,
      uiState,
      longLoadingMessage,
    }),
    [
      status,
      data,
      viewModels,
      loadingMessage,
      errorMessage,
      stale,
      refresh,
      refreshing,
      contentLoadingActive,
      contentOverlayVisible,
      performanceControlsDisabled,
      uiState,
      longLoadingMessage,
    ],
  );

  return (
    <PerformanceDataContext.Provider value={value}>
      {children}
    </PerformanceDataContext.Provider>
  );
}

export function usePerformanceData(): PerformanceDataContextValue {
  const ctx = useContext(PerformanceDataContext);
  if (!ctx) {
    throw new Error("usePerformanceData must be used within PerformanceDataProvider");
  }
  return ctx;
}

export function useOptionalPerformanceData(): PerformanceDataContextValue | null {
  return useContext(PerformanceDataContext);
}

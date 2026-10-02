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
  dateRangeKeyFromPerformanceRange,
  type PerformanceDateRange,
} from "../domain/performance/performanceDateRange";
import type { PerformanceAudience } from "../domain/performance/reportParams";
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
  enabled: boolean;
  dateRange: PerformanceDateRange;
  reviewTarget: PerformanceReviewTarget;
  audience: PerformanceAudience;
  selfPersonId: string;
  managerTeamTray: boolean;
  children: ReactNode;
}

export function PerformanceDataProvider({
  enabled,
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
  const dataRef = useRef(data);
  const viewModelsRef = useRef(viewModels);
  const managerTeamTrayRef = useRef(managerTeamTray);
  dataRef.current = data;
  viewModelsRef.current = viewModels;
  managerTeamTrayRef.current = managerTeamTray;

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!enabled) {
        return;
      }
      const hasData = dataRef.current != null;
      setStatus(hasData ? "refreshing" : "loading");
      if (mode === "refresh" && hasData) {
        setStale(false);
      }
      setErrorMessage(null);

      try {
        const next = await fetchPerformanceData(dateRange, reviewTarget, audience);
        const models = buildPerformanceViewModels(
          next,
          selfPersonId,
          dateRangeKeyFromPerformanceRange(dateRange),
          dateRange,
        );
        setData(next);
        setViewModels(models);
        const partial =
          next.partialWarnings.length > 0 || Boolean(models.statusMessage);
        setStatus(partial ? "partial" : "ready");
        setStale(false);
        setErrorMessage(null);
        await applyPerformanceRefreshSideEffects(next, {
          managerTeamTray: managerTeamTrayRef.current,
        });
      } catch (error) {
        const message = errorMessageFromError(error);
        setErrorMessage(message);
        if (dataRef.current) {
          setStale(true);
          setStatus("partial");
          await markPerformanceIntegrationsStale({
            jira: /jira/i.test(message),
            bamboo: /bamboo/i.test(message),
          });
        } else {
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

  const refresh = useCallback(async () => {
    await coalescedLoadRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    if (dataRef.current) {
      void coalescedLoadRef.current();
    } else {
      void load("initial");
    }
  }, [enabled, dateRange, reviewTarget, audience, selfPersonId, load]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let disposed = false;
    let unregister: (() => void) | undefined;

    void (async () => {
      try {
        const unsub = await registerCoalescedBackgroundRefresh(refresh);
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
  }, [enabled, refresh]);

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

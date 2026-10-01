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
import type { DateRangeKey } from "../domain/performance";
import { fetchPerformanceData } from "../services/performance/performanceDataService";
import {
  buildPerformanceViewModels,
  type PerformanceViewModels,
} from "../services/performance/performanceViewModel";
import { registerBackgroundRefreshListeners } from "../services/refresh/backgroundRefresh";

export type PerformanceLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "refreshing"
  | "partial"
  | "error";

export interface PerformanceDataContextValue {
  status: PerformanceLoadStatus;
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
  dateRange: DateRangeKey;
  selfPersonId: string;
  children: ReactNode;
}

export function PerformanceDataProvider({
  enabled,
  dateRange,
  selfPersonId,
  children,
}: PerformanceDataProviderProps) {
  const [viewModels, setViewModels] = useState<PerformanceViewModels | null>(
    null,
  );
  const [status, setStatus] = useState<PerformanceLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const inFlightRef = useRef(false);
  const viewModelsRef = useRef(viewModels);
  viewModelsRef.current = viewModels;

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!enabled || inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      const hasData = viewModelsRef.current != null;
      setStatus(hasData ? "refreshing" : "loading");
      if (mode === "refresh" && hasData) {
        setStale(false);
      }
      setErrorMessage(null);

      try {
        const data = await fetchPerformanceData(dateRange);
        const models = buildPerformanceViewModels(data, selfPersonId);
        setViewModels(models);
        const partial =
          data.partialWarnings.length > 0 || Boolean(models.statusMessage);
        setStatus(partial ? "partial" : "ready");
        setStale(false);
        setErrorMessage(null);
      } catch (error) {
        const message = errorMessageFromError(error);
        setErrorMessage(message);
        if (viewModelsRef.current) {
          setStale(true);
          setStatus("partial");
        } else {
          setStatus("error");
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [dateRange, enabled, selfPersonId],
  );

  const refresh = useCallback(async () => {
    await load("refresh");
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    void load("initial");
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let disposed = false;
    let unregister: (() => void) | undefined;

    void (async () => {
      try {
        const unsub = await registerBackgroundRefreshListeners({
          onJiraRefresh: () => {
            if (!disposed) void refresh();
          },
          onBambooRefresh: () => {
            if (!disposed) void refresh();
          },
          onSystemResumed: () => {
            if (!disposed) void refresh();
          },
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
  }, [enabled, refresh]);

  const loadingMessage =
    status === "loading" || status === "refreshing"
      ? "Fetching team data…"
      : null;

  const refreshing = status === "refreshing";

  const value = useMemo(
    (): PerformanceDataContextValue => ({
      status,
      viewModels,
      loadingMessage,
      errorMessage,
      stale,
      refresh,
      refreshing,
    }),
    [
      status,
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

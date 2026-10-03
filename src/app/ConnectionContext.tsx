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
import {
  bootstrapProductionSession,
  SESSION_STORAGE_ERROR_MESSAGE,
} from "./appSession";
import { bootLog, bootLogError, getLastBootStage } from "./bootDiagnostics";
import { recordStartupPhase } from "../platform/observability/observabilityStore";
import {
  registerSessionInvalidator,
  unregisterSessionInvalidator,
} from "./sessionInvalidation";
import type { ConnectionStatus } from "./connectionStorage";
import {
  clearSessionMarker,
  isAppConnected,
  markSessionConnected,
} from "./connectionStorage";

export type ConnectionGate = "bootstrapping" | "disconnected" | "connected";

const BOOTSTRAP_TIMEOUT_MS = 10_000;

interface ConnectionContextValue {
  gate: ConnectionGate;
  isConnected: boolean;
  isBootstrapping: boolean;
  sessionRestoreError: string | null;
  startupError: string | null;
  completeConnection: () => void;
  resetConnection: () => void;
  invalidateSession: () => void;
  retryBootstrap: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<ConnectionGate>(() => {
    if (import.meta.env.DEV) {
      return isAppConnected() ? "connected" : "disconnected";
    }
    return "bootstrapping";
  });
  const [sessionRestoreError, setSessionRestoreError] = useState<string | null>(
    null,
  );
  const [startupError, setStartupError] = useState<string | null>(null);
  const bootstrapRunRef = useRef(0);

  const invalidateSession = useCallback(() => {
    clearSessionMarker();
    setGate("disconnected");
  }, []);

  const applyBootstrapResult = useCallback(
    (result: Awaited<ReturnType<typeof bootstrapProductionSession>>) => {
      if (result.kind === "ready") {
        bootLog("11", "bootstrap result=ready");
        setStartupError(null);
        setSessionRestoreError(null);
        setGate("connected");
        return;
      }

      if (result.kind === "connection_required") {
        bootLog("11", `bootstrap result=connection_required reason=${result.reason}`);
        clearSessionMarker();
        setStartupError(null);
        setSessionRestoreError(null);
        setGate("disconnected");
        return;
      }

      bootLog("11", "bootstrap result=storage_error");
      clearSessionMarker();
      setStartupError(null);
      setSessionRestoreError(result.message || SESSION_STORAGE_ERROR_MESSAGE);
      setGate("disconnected");
    },
    [],
  );

  const runBootstrap = useCallback(() => {
    if (import.meta.env.DEV) {
      return;
    }

    const runId = ++bootstrapRunRef.current;
    const bootstrapStarted = performance.now();
    setStartupError(null);
    setGate("bootstrapping");
    bootLog("06", "bootstrap started");

    const timeoutId = window.setTimeout(() => {
      if (bootstrapRunRef.current !== runId) {
        return;
      }
      bootstrapRunRef.current += 1;
      bootLog("WT", `bootstrap timeout lastStage=${getLastBootStage()}`);
      setStartupError(
        "Startup is taking longer than expected. Check your connection and try again.",
      );
      setGate("disconnected");
    }, BOOTSTRAP_TIMEOUT_MS);

    void bootstrapProductionSession()
      .then((result) => {
        if (bootstrapRunRef.current !== runId) {
          return;
        }
        window.clearTimeout(timeoutId);
        recordStartupPhase(
          "bootstrap",
          Math.round(performance.now() - bootstrapStarted),
        );
        applyBootstrapResult(result);
      })
      .catch((error) => {
        if (bootstrapRunRef.current !== runId) {
          return;
        }
        window.clearTimeout(timeoutId);
        bootLogError("11", error);
        clearSessionMarker();
        setStartupError("Metrio couldn't start. Try again or open the logs folder.");
        setGate("disconnected");
      });
  }, [applyBootstrapResult]);

  useEffect(() => {
    bootLog("05", "ConnectionProvider mounted");
    const invalidator = () => {
      setGate("disconnected");
    };
    registerSessionInvalidator(invalidator);
    return () => {
      unregisterSessionInvalidator(invalidator);
    };
  }, []);

  useEffect(() => {
    runBootstrap();
  }, [runBootstrap]);

  const completeConnection = useCallback(() => {
    markSessionConnected();
    setSessionRestoreError(null);
    setStartupError(null);
    setGate("connected");
  }, []);

  const resetConnection = useCallback(() => {
    setSessionRestoreError(null);
    setStartupError(null);
    setGate("disconnected");
  }, []);

  const retryBootstrap = useCallback(() => {
    runBootstrap();
  }, [runBootstrap]);

  const value = useMemo(
    () => ({
      gate,
      isConnected: gate === "connected",
      isBootstrapping: gate === "bootstrapping",
      sessionRestoreError,
      startupError,
      completeConnection,
      resetConnection,
      invalidateSession,
      retryBootstrap,
    }),
    [
      gate,
      sessionRestoreError,
      startupError,
      completeConnection,
      resetConnection,
      invalidateSession,
      retryBootstrap,
    ],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnectionGate(): ConnectionContextValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error("useConnectionGate must be used within ConnectionProvider");
  }
  return ctx;
}

export type { ConnectionStatus };

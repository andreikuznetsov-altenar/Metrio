import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  bootstrapProductionSession,
  SESSION_STORAGE_ERROR_MESSAGE,
} from "./appSession";
import type { ConnectionStatus } from "./connectionStorage";
import {
  clearSessionMarker,
  isAppConnected,
  markSessionConnected,
} from "./connectionStorage";

export type ConnectionGate = "bootstrapping" | "disconnected" | "connected";

interface ConnectionContextValue {
  gate: ConnectionGate;
  isConnected: boolean;
  isBootstrapping: boolean;
  sessionRestoreError: string | null;
  completeConnection: () => void;
  resetConnection: () => void;
  invalidateSession: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

type SessionInvalidator = () => void;

let sessionInvalidator: SessionInvalidator | null = null;

export function invalidateAuthenticatedSession(): void {
  clearSessionMarker();
  sessionInvalidator?.();
}

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

  const invalidateSession = useCallback(() => {
    clearSessionMarker();
    setGate("disconnected");
  }, []);

  useEffect(() => {
    sessionInvalidator = () => {
      setGate("disconnected");
    };
    return () => {
      sessionInvalidator = null;
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    let cancelled = false;
    void bootstrapProductionSession().then((result) => {
      if (cancelled) {
        return;
      }

      if (result.kind === "ready") {
        setSessionRestoreError(null);
        setGate("connected");
        return;
      }

      if (result.kind === "connection_required") {
        clearSessionMarker();
        setSessionRestoreError(null);
        setGate("disconnected");
        return;
      }

      clearSessionMarker();
      setSessionRestoreError(result.message || SESSION_STORAGE_ERROR_MESSAGE);
      setGate("disconnected");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const completeConnection = useCallback(() => {
    markSessionConnected();
    setSessionRestoreError(null);
    setGate("connected");
  }, []);

  const resetConnection = useCallback(() => {
    setSessionRestoreError(null);
    setGate("disconnected");
  }, []);

  const value = useMemo(
    () => ({
      gate,
      isConnected: gate === "connected",
      isBootstrapping: gate === "bootstrapping",
      sessionRestoreError,
      completeConnection,
      resetConnection,
      invalidateSession,
    }),
    [
      gate,
      sessionRestoreError,
      completeConnection,
      resetConnection,
      invalidateSession,
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

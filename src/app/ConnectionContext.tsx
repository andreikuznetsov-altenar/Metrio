import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ConnectionStatus } from "./connectionStorage";
import { isAppConnected } from "./connectionStorage";

interface ConnectionContextValue {
  isConnected: boolean;
  completeConnection: () => void;
  resetConnection: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(() => isAppConnected());

  const completeConnection = useCallback(() => {
    setIsConnected(true);
  }, []);

  const resetConnection = useCallback(() => {
    setIsConnected(false);
  }, []);

  const value = useMemo(
    () => ({ isConnected, completeConnection, resetConnection }),
    [isConnected, completeConnection, resetConnection],
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

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastHost } from "./ToastHost";
import type { ToastInput, ToastRecord, ToastVariant } from "./toastTypes";

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3500,
  info: 3500,
  warning: 5500,
  error: 5500,
};

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  success: (message: string) => string;
  error: (message: string) => string;
  warning: (message: string) => string;
  info: (message: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutRef = useRef<number | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const variant = input.variant ?? "info";
      const id =
        input.id ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record: ToastRecord = {
        ...input,
        id,
        variant,
        durationMs: input.durationMs ?? DEFAULT_DURATION[variant],
      };
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setToasts([record]);
      if (record.durationMs > 0) {
        timeoutRef.current = window.setTimeout(() => {
          dismiss(id);
          timeoutRef.current = null;
        }, record.durationMs);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    (): ToastContextValue => ({
      toast,
      dismiss,
      success: (message) => toast({ message, variant: "success" }),
      error: (message) => toast({ message, variant: "error" }),
      warning: (message) => toast({ message, variant: "warning" }),
      info: (message) => toast({ message, variant: "info" }),
    }),
    [dismiss, toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

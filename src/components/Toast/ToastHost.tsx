import { AlertCircle, Check, Info, X } from "lucide-react";
import type { ToastRecord } from "./toastTypes";
import "./Toast.css";

function ToastIcon({ variant }: { variant: ToastRecord["variant"] }) {
  const props = { size: 16, strokeWidth: 1.75, "aria-hidden": true as const };
  if (variant === "success") return <Check {...props} />;
  if (variant === "error") return <AlertCircle {...props} />;
  if (variant === "warning") return <AlertCircle {...props} />;
  return <Info {...props} />;
}

export interface ToastHostProps {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (!toasts.length) return null;

  return (
    <div className="toast-viewport metrio-toast-host" aria-live="polite">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`toast toast--${item.variant}`}
          role={item.variant === "error" ? "alert" : "status"}
        >
          <span className="toast__icon">
            <ToastIcon variant={item.variant} />
          </span>
          <p className="toast__message">{item.message}</p>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(item.id)}
          >
            <X size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

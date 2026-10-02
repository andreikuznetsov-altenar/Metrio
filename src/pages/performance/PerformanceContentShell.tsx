import type { ReactNode } from "react";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { ContentLoadingOverlay } from "../../components/ContentLoadingOverlay/ContentLoadingOverlay";
import "./performance-content-shell.css";

export interface PerformanceContentShellProps {
  children: ReactNode;
}

export function PerformanceContentShell({
  children,
}: PerformanceContentShellProps) {
  const { contentOverlayVisible, contentLoadingActive } = usePerformanceData();

  const visualForceOverlay =
    import.meta.env.VITE_VISUAL_FIXTURE === "1" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("visualOverlay") === "1";

  const overlayVisible = contentOverlayVisible || visualForceOverlay;
  const busy = contentLoadingActive || overlayVisible;

  return (
    <div
      className="performance-content-area"
      data-testid="performance-content-area"
      aria-busy={busy || undefined}
    >
      <span className="sr-only" role="status" aria-live="polite">
        {overlayVisible ? "Loading performance data" : ""}
      </span>
      {children}
      <ContentLoadingOverlay visible={overlayVisible} />
    </div>
  );
}

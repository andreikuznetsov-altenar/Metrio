import { useEffect, useRef, useState, type TransitionEvent } from "react";
import { Button } from "../Button/Button";
import { useOptionalPerformanceData } from "../../app/PerformanceDataContext";
import {
  GLOBAL_REFRESH_STATUS_COPY,
  shouldShowGlobalRefreshStatusPanel,
} from "../../app/globalRefreshStatus";
import { formatRelativeSync } from "../../platform/observability/connectionDiagnostics";
import "./GlobalRefreshStatusPanel.css";

type PanelPhase = "hidden" | "enter" | "visible" | "exit";

export function GlobalRefreshStatusPanel() {
  const data = useOptionalPerformanceData();
  const shouldShow = Boolean(
    data &&
      shouldShowGlobalRefreshStatusPanel({
        refreshFailedWithUsableCache: data.refreshFailedWithUsableCache,
        hasUsableData: Boolean(data.viewModels || data.data),
        status: data.status,
        uiState: data.uiState,
      }),
  );

  const [phase, setPhase] = useState<PanelPhase>("hidden");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const exitTimerRef = useRef<number | null>(null);
  const enterFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterFrameRef.current != null) {
        window.cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const current = phaseRef.current;
    if (shouldShow) {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (current === "hidden") {
        setPhase("enter");
        enterFrameRef.current = window.requestAnimationFrame(() => {
          enterFrameRef.current = window.requestAnimationFrame(() => {
            enterFrameRef.current = null;
            if (mountedRef.current) {
              setPhase("visible");
            }
          });
        });
      } else if (current === "exit") {
        setPhase("visible");
      }
      return () => {
        if (enterFrameRef.current != null) {
          window.cancelAnimationFrame(enterFrameRef.current);
          enterFrameRef.current = null;
        }
      };
    }
    if (current === "enter" || current === "visible") {
      setPhase("exit");
    }
  }, [shouldShow]);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = window.setTimeout(() => {
      setPhase("hidden");
    }, 240);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform" && event.propertyName !== "opacity") {
      return;
    }
    if (phase !== "exit") return;
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = window.setTimeout(() => {
      setPhase("hidden");
      exitTimerRef.current = null;
    }, 0);
  };

  if (phase === "hidden" || !data) {
    return null;
  }

  const lastUpdated = data.performanceLastUpdatedAt;

  return (
    <div
      className="global-refresh-status-panel"
      data-testid="global-refresh-status-panel"
      data-phase={phase}
      role="status"
      onTransitionEnd={onTransitionEnd}
    >
      <p className="global-refresh-status-panel__copy">
        {GLOBAL_REFRESH_STATUS_COPY}
        {lastUpdated ? (
          <span className="global-refresh-status-panel__meta">
            Last successful result {formatRelativeSync(lastUpdated)}
          </span>
        ) : null}
      </p>
      <Button
        type="button"
        variant="secondary"
        data-testid="global-refresh-status-retry"
        onClick={() => void data.refresh()}
      >
        Retry
      </Button>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { readMotionDrawerCloseMs } from "../../styles/motion";

export type DrawerSurfacePhase =
  | "closed"
  | "mounted-closed"
  | "opening"
  | "open"
  | "closing";

export interface DrawerSurfaceLifecycle {
  mounted: boolean;
  /** Drives `is-open` (panel on-screen); false while offscreen or exiting. */
  presented: boolean;
  phase: DrawerSurfacePhase;
  panelRef: RefObject<HTMLElement | null>;
}

function runDoubleFrame(callback: () => void): number {
  return window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

/**
 * WKWebView-safe drawer lifecycle: paint offscreen before open, paint onscreen before close exit.
 */
export function useDrawerSurfaceLifecycle(
  open: boolean,
  onClosed?: () => void,
): DrawerSurfaceLifecycle {
  const panelRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [presented, setPresented] = useState(false);
  const frameRef = useRef<number | null>(null);

  const cancelFrame = useCallback(() => {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const completeClose = useCallback(() => {
    setMounted(false);
    setPresented(false);
    onClosed?.();
  }, [onClosed]);

  useEffect(() => {
    cancelFrame();

    if (open) {
      setMounted(true);
      setPresented(false);
      frameRef.current = runDoubleFrame(() => {
        const panel = panelRef.current;
        if (panel) {
          void panel.getBoundingClientRect();
        }
        setPresented(true);
      });
      return cancelFrame;
    }

    if (!mounted) {
      return undefined;
    }

    frameRef.current = runDoubleFrame(() => {
      const panel = panelRef.current;
      if (panel) {
        void panel.getBoundingClientRect();
      }
      setPresented(false);
    });
    return cancelFrame;
  }, [cancelFrame, mounted, open]);

  useEffect(() => {
    if (!mounted || open || presented) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      completeClose();
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      completeClose();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      completeClose();
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== panel) return;
      if (event.propertyName !== "transform") return;
      finish();
    };

    panel.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(finish, readMotionDrawerCloseMs() + 80);

    return () => {
      panel.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [completeClose, mounted, open, presented]);

  const phase: DrawerSurfacePhase = !mounted
    ? "closed"
    : open && !presented
      ? "opening"
      : (open && presented) || (!open && presented)
        ? "open"
        : "closing";

  return { mounted, presented, phase, panelRef };
}

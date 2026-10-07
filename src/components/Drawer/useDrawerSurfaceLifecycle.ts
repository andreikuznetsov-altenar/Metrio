import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { readMotionDrawerCloseMs } from "../../styles/motion";

export type DrawerSurfacePhase = "closed" | "opening" | "open" | "closing";

export interface DrawerSurfaceLifecycle {
  mounted: boolean;
  visible: boolean;
  phase: DrawerSurfacePhase;
  panelRef: RefObject<HTMLElement | null>;
}

/**
 * Keeps the drawer mounted through transform/opacity exit and tears down on transitionend.
 * Opening uses a double rAF so the offscreen state paints before `is-open` applies.
 */
export function useDrawerSurfaceLifecycle(
  open: boolean,
  onClosed?: () => void,
): DrawerSurfaceLifecycle {
  const panelRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const frameRef = useRef<number | null>(null);

  const completeClose = useCallback(() => {
    setMounted(false);
    onClosed?.();
  }, [onClosed]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);
      const frame = window.requestAnimationFrame(() => {
        frameRef.current = window.requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      frameRef.current = frame;
      return () => {
        if (frameRef.current != null) {
          window.cancelAnimationFrame(frameRef.current);
        }
      };
    }

    setVisible(false);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!mounted || open || visible) {
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
  }, [completeClose, mounted, open, visible]);

  const phase: DrawerSurfacePhase = !mounted
    ? "closed"
    : visible
      ? open
        ? "open"
        : "closing"
      : open
        ? "opening"
        : "closing";

  return { mounted, visible, phase, panelRef };
}

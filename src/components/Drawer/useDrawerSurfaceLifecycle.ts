import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  logDrawerMotionDev,
  playDrawerEnterMotion,
  playDrawerExitMotion,
  type DrawerMotionRun,
} from "./drawerPanelMotion";

export type DrawerSurfacePhase = "closed" | "entering" | "open" | "exiting";

export interface DrawerSurfaceLifecycle {
  mounted: boolean;
  phase: DrawerSurfacePhase;
  panelRef: RefObject<HTMLElement | null>;
  backdropRef: RefObject<HTMLButtonElement | null>;
}

export function useDrawerSurfaceLifecycle(
  open: boolean,
  onClosed?: () => void,
): DrawerSurfaceLifecycle {
  const panelRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<DrawerSurfacePhase>(open ? "entering" : "closed");
  const runGenRef = useRef(0);
  const openRef = useRef(open);
  const onClosedRef = useRef(onClosed);
  const activeMotionRef = useRef<DrawerMotionRun | null>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    logDrawerMotionDev(open ? "open-requested" : "close-requested", {});
  }, [open]);

  const cancelMotion = useCallback(() => {
    activeMotionRef.current?.cancel();
    activeMotionRef.current = null;
  }, []);

  const completeClose = useCallback(() => {
    cancelMotion();
    setMounted(false);
    setPhase("closed");
    onClosedRef.current?.();
    logDrawerMotionDev("unmounted", {});
  }, [cancelMotion]);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted) {
      return undefined;
    }

    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) {
      if (!open) {
        completeClose();
      }
      return undefined;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      cancelMotion();
      if (open) {
        setPhase("open");
        panel.style.transform = "translate3d(0, 0, 0)";
        panel.style.opacity = "1";
        backdrop.style.opacity = "1";
      } else {
        completeClose();
      }
      return undefined;
    }

    const generation = ++runGenRef.current;
    cancelMotion();

    if (open) {
      setPhase("entering");
      panel.style.opacity = "1";
      if (!panel.style.transform) {
        panel.style.transform = "translate3d(100%, 0, 0)";
      }
      void panel.getBoundingClientRect();
      logDrawerMotionDev("animation-started", { kind: "enter" });
      const motion = playDrawerEnterMotion(panel, backdrop);
      activeMotionRef.current = motion;
      void motion.finished.then(() => {
        if (runGenRef.current !== generation) return;
        if (!openRef.current) return;
        setPhase("open");
        logDrawerMotionDev("animation-finished", { kind: "enter" });
      });
    } else {
      setPhase("exiting");
      logDrawerMotionDev("animation-started", { kind: "exit" });
      const motion = playDrawerExitMotion(panel, backdrop);
      activeMotionRef.current = motion;
      void motion.finished.then(() => {
        if (runGenRef.current !== generation) return;
        if (openRef.current) return;
        logDrawerMotionDev("animation-finished", { kind: "exit" });
        completeClose();
      });
    }

    return () => {
      runGenRef.current += 1;
      cancelMotion();
    };
  }, [cancelMotion, completeClose, mounted, open]);

  return { mounted, phase, panelRef, backdropRef };
}

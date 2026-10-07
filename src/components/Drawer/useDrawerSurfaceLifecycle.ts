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
  const activeMotionRef = useRef<DrawerMotionRun | null>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const cancelMotion = useCallback(() => {
    activeMotionRef.current?.cancel();
    activeMotionRef.current = null;
  }, []);

  const completeClose = useCallback(() => {
    cancelMotion();
    setMounted(false);
    setPhase("closed");
    onClosed?.();
    logDrawerMotionDev("unmount", {});
  }, [cancelMotion, onClosed]);

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
      panel.style.transform = "translate3d(100%, 0, 0)";
      panel.style.opacity = "0";
      backdrop.style.opacity = "0";
      void panel.getBoundingClientRect();
      logDrawerMotionDev("enter-start", {
        transform: getComputedStyle(panel).transform,
      });
      const motion = playDrawerEnterMotion(panel, backdrop);
      activeMotionRef.current = motion;
      void motion.finished.then(() => {
        if (runGenRef.current !== generation) return;
        if (!openRef.current) return;
        setPhase("open");
        logDrawerMotionDev("enter-finish", {
          transform: getComputedStyle(panel).transform,
        });
      });
    } else {
      setPhase("exiting");
      logDrawerMotionDev("exit-start", {
        transform: getComputedStyle(panel).transform,
      });
      const motion = playDrawerExitMotion(panel, backdrop);
      activeMotionRef.current = motion;
      void motion.finished.then(() => {
        if (runGenRef.current !== generation) return;
        if (openRef.current) return;
        logDrawerMotionDev("exit-finish", {
          transform: getComputedStyle(panel).transform,
        });
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

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  DRAWER_OFFSCREEN_TRANSFORM,
  logDrawerMotionDev,
  playDrawerEnterMotion,
  playDrawerExitMotion,
  type DrawerMotionRun,
} from "./drawerPanelMotion";

export type DrawerSurfacePhase =
  | "closed"
  | "mounted-enter"
  | "entering"
  | "open"
  | "exiting";

export interface DrawerSurfaceLifecycle {
  mounted: boolean;
  phase: DrawerSurfacePhase;
  panelRef: RefObject<HTMLElement | null>;
  backdropRef: RefObject<HTMLButtonElement | null>;
}

function schedulePaintThen(run: () => void): { cancel: () => void } {
  let cancelled = false;
  let raf2 = 0;
  const raf1 = window.requestAnimationFrame(() => {
    raf2 = window.requestAnimationFrame(() => {
      if (!cancelled) run();
    });
  });
  return {
    cancel: () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    },
  };
}

/**
 * Canonical drawer shell lifecycle (data-independent):
 * closed → mounted-enter (offscreen paint) → entering → open → exiting → closed
 */
export function useDrawerSurfaceLifecycle(
  open: boolean,
  onClosed?: () => void,
): DrawerSurfaceLifecycle {
  const panelRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLButtonElement | null>(null);
  // When first rendered already open (PersonDetailDrawer mounts with open=true),
  // start in mounted-enter so the first paint is offscreen — never open.
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<DrawerSurfacePhase>(
    open ? "mounted-enter" : "closed",
  );
  const runGenRef = useRef(0);
  const openRef = useRef(open);
  const onClosedRef = useRef(onClosed);
  const activeMotionRef = useRef<DrawerMotionRun | null>(null);
  const paintWaitRef = useRef<{ cancel: () => void } | null>(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    logDrawerMotionDev(open ? "open-requested" : "close-requested", {});
  }, [open]);

  const cancelPaintWait = useCallback(() => {
    paintWaitRef.current?.cancel();
    paintWaitRef.current = null;
  }, []);

  const cancelMotion = useCallback(() => {
    activeMotionRef.current?.cancel();
    activeMotionRef.current = null;
  }, []);

  const completeClose = useCallback(() => {
    cancelPaintWait();
    cancelMotion();
    setMounted(false);
    setPhase("closed");
    onClosedRef.current?.();
    logDrawerMotionDev("unmounted", {});
  }, [cancelMotion, cancelPaintWait]);

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
      cancelPaintWait();
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
    cancelPaintWait();
    cancelMotion();

    if (open) {
      const interruptingExit = phaseRef.current === "exiting";

      if (interruptingExit) {
        // Resume toward open from the current mid-exit transform — no snap.
        setPhase("entering");
        logDrawerMotionDev("animation-started", {
          kind: "enter",
          mode: "interrupt-exit",
        });
        const motion = playDrawerEnterMotion(panel, backdrop, {
          fromTransform: panel.style.transform || undefined,
          fromBackdropOpacity: Number(backdrop.style.opacity || 0),
        });
        activeMotionRef.current = motion;
        void motion.finished.then(() => {
          if (runGenRef.current !== generation) return;
          if (!openRef.current) return;
          setPhase("open");
          logDrawerMotionDev("animation-finished", { kind: "enter" });
        });
        return () => {
          runGenRef.current += 1;
          cancelPaintWait();
          cancelMotion();
        };
      }

      // FRAME A — mount/pin offscreen. Must paint before enter keyframes.
      setPhase("mounted-enter");
      panel.style.transform = DRAWER_OFFSCREEN_TRANSFORM;
      panel.style.opacity = "1";
      backdrop.style.opacity = "0";
      void panel.getBoundingClientRect();
      logDrawerMotionDev("mounted-enter", {
        transform: panel.style.transform,
      });

      paintWaitRef.current = schedulePaintThen(() => {
        if (runGenRef.current !== generation) return;
        if (!openRef.current) return;
        // FRAME B — only now start WAAPI from explicit offscreen.
        setPhase("entering");
        logDrawerMotionDev("animation-started", {
          kind: "enter",
          mode: "fresh",
          transform: DRAWER_OFFSCREEN_TRANSFORM,
        });
        const motion = playDrawerEnterMotion(panel, backdrop, {
          fromTransform: DRAWER_OFFSCREEN_TRANSFORM,
          fromBackdropOpacity: 0,
        });
        activeMotionRef.current = motion;
        void motion.finished.then(() => {
          if (runGenRef.current !== generation) return;
          if (!openRef.current) return;
          setPhase("open");
          logDrawerMotionDev("animation-finished", { kind: "enter" });
        });
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
      cancelPaintWait();
      cancelMotion();
    };
  }, [cancelMotion, cancelPaintWait, completeClose, mounted, open]);

  return { mounted, phase, panelRef, backdropRef };
}

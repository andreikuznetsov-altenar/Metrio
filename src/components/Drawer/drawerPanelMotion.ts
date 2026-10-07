import {
  readMotionDrawerCloseMs,
  readMotionDrawerOpenMs,
} from "../../styles/motion";

const DRAWER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const PANEL_ENTER: Keyframe[] = [
  { transform: "translate3d(100%, 0, 0)", opacity: 0 },
  { transform: "translate3d(0, 0, 0)", opacity: 1 },
];

const PANEL_EXIT: Keyframe[] = [
  { transform: "translate3d(0, 0, 0)", opacity: 1 },
  { transform: "translate3d(100%, 0, 0)", opacity: 0 },
];

const BACKDROP_ENTER: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const BACKDROP_EXIT: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];

export type DrawerMotionRun = {
  cancel: () => void;
  finished: Promise<void>;
};

function runKeyframes(
  target: Element,
  keyframes: Keyframe[],
  durationMs: number,
): DrawerMotionRun {
  if (typeof target.animate !== "function") {
    return {
      cancel: () => undefined,
      finished: Promise.resolve(),
    };
  }
  const animation = target.animate(keyframes, {
    duration: durationMs,
    easing: DRAWER_EASING,
    fill: "forwards",
  });
  return {
    cancel: () => animation.cancel(),
    finished: animation.finished.then(() => undefined).catch(() => undefined),
  };
}

export function playDrawerEnterMotion(
  panel: HTMLElement,
  backdrop: HTMLElement,
): DrawerMotionRun {
  const duration = readMotionDrawerOpenMs();
  const panelRun = runKeyframes(panel, PANEL_ENTER, duration);
  const backdropRun = runKeyframes(backdrop, BACKDROP_ENTER, duration);
  return {
    cancel: () => {
      panelRun.cancel();
      backdropRun.cancel();
    },
    finished: Promise.all([panelRun.finished, backdropRun.finished]).then(() => undefined),
  };
}

export function playDrawerExitMotion(
  panel: HTMLElement,
  backdrop: HTMLElement,
): DrawerMotionRun {
  const duration = readMotionDrawerCloseMs();
  const panelRun = runKeyframes(panel, PANEL_EXIT, duration);
  const backdropRun = runKeyframes(backdrop, BACKDROP_EXIT, duration);
  return {
    cancel: () => {
      panelRun.cancel();
      backdropRun.cancel();
    },
    finished: Promise.all([panelRun.finished, backdropRun.finished]).then(() => undefined),
  };
}

export function logDrawerMotionDev(event: string, detail: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  const enabled = window.localStorage.getItem("metrio-drawer-motion-debug") === "1";
  if (!enabled) return;
  const bucket = (window as unknown as { __metrioDrawerMotion?: unknown[] }).__metrioDrawerMotion;
  const entry = { t: performance.now(), event, ...detail };
  if (Array.isArray(bucket)) {
    bucket.push(entry);
  } else {
    (window as unknown as { __metrioDrawerMotion: unknown[] }).__metrioDrawerMotion = [entry];
  }
}

import {
  readMotionDrawerCloseMs,
  readMotionDrawerOpenMs,
} from "../../styles/motion";

const DRAWER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export type DrawerMotionRun = {
  cancel: () => void;
  finished: Promise<void>;
};

function readPanelTransform(panel: HTMLElement): string {
  const transform = getComputedStyle(panel).transform;
  if (transform && transform !== "none") {
    return transform;
  }
  return "translate3d(0, 0, 0)";
}

function readOpacity(el: HTMLElement): number {
  const value = getComputedStyle(el).opacity;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 1;
}

function commitAnimationStyles(animation: Animation) {
  if (typeof animation.commitStyles === "function") {
    try {
      animation.commitStyles();
    } catch {
      /* fill forwards already applied */
    }
  }
}

function runKeyframes(
  target: HTMLElement,
  keyframes: Keyframe[],
  durationMs: number,
): DrawerMotionRun {
  if (typeof target.animate !== "function") {
    const last = keyframes[keyframes.length - 1];
    if (last?.transform) {
      target.style.transform = String(last.transform);
    }
    if (last?.opacity !== undefined) {
      target.style.opacity = String(last.opacity);
    }
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
    finished: animation.finished
      .then(() => {
        commitAnimationStyles(animation);
      })
      .catch(() => undefined),
  };
}

export function playDrawerEnterMotion(
  panel: HTMLElement,
  backdrop: HTMLElement,
): DrawerMotionRun {
  const duration = readMotionDrawerOpenMs();
  const panelFrom = readPanelTransform(panel);
  const backdropFrom = readOpacity(backdrop);
  const panelRun = runKeyframes(
    panel,
    [
      { transform: panelFrom, opacity: readOpacity(panel) },
      { transform: "translate3d(0, 0, 0)", opacity: 1 },
    ],
    duration,
  );
  const backdropRun = runKeyframes(
    backdrop,
    [{ opacity: backdropFrom }, { opacity: 1 }],
    duration,
  );
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
  const panelFrom = readPanelTransform(panel);
  const backdropFrom = readOpacity(backdrop);
  const panelRun = runKeyframes(
    panel,
    [
      { transform: panelFrom, opacity: readOpacity(panel) },
      { transform: "translate3d(100%, 0, 0)", opacity: 0 },
    ],
    duration,
  );
  const backdropRun = runKeyframes(
    backdrop,
    [{ opacity: backdropFrom }, { opacity: 0 }],
    duration,
  );
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

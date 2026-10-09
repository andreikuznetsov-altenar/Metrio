import {
  readMotionDrawerCloseMs,
  readMotionDrawerOpenMs,
} from "../../styles/motion";

const DRAWER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export const DRAWER_OFFSCREEN_TRANSFORM = "translate3d(100%, 0, 0)";
export const DRAWER_OPEN_TRANSFORM = "translate3d(0, 0, 0)";

export type DrawerMotionRun = {
  cancel: () => void;
  finished: Promise<void>;
};

function readPanelTransform(panel: HTMLElement): string {
  const inline = panel.style.transform?.trim();
  if (inline) {
    return inline;
  }
  const transform = getComputedStyle(panel).transform;
  if (transform && transform !== "none") {
    return transform;
  }
  // Unresolved layout must not be treated as open.
  return DRAWER_OFFSCREEN_TRANSFORM;
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
    cancel: () => {
      commitAnimationStyles(animation);
      animation.cancel();
    },
    finished: animation.finished
      .then(() => {
        commitAnimationStyles(animation);
      })
      .catch(() => undefined),
  };
}

function sampleEnterTransforms(panel: HTMLElement, durationMs: number): { cancel: () => void } {
  if (typeof window === "undefined") return { cancel: () => undefined };
  if (window.localStorage.getItem("metrio-drawer-motion-debug") !== "1") {
    return { cancel: () => undefined };
  }
  const marks = [0, 80, 160, 240, 320, 400];
  const timers: number[] = [];
  const t0 = performance.now();
  for (const ms of marks) {
    const id = window.setTimeout(() => {
      const inline = panel.style.transform;
      let matrixX: string | null = null;
      try {
        const computed = getComputedStyle(panel).transform;
        if (computed && computed !== "none") matrixX = computed;
      } catch {
        /* ignore */
      }
      logDrawerMotionDev("transform-sample", {
        atMs: Math.round(performance.now() - t0),
        markMs: ms,
        durationMs,
        inline,
        computed: matrixX,
      });
    }, ms);
    timers.push(id);
  }
  return {
    cancel: () => {
      for (const id of timers) window.clearTimeout(id);
    },
  };
}

export function playDrawerEnterMotion(
  panel: HTMLElement,
  backdrop: HTMLElement,
  options?: { fromTransform?: string; fromBackdropOpacity?: number },
): DrawerMotionRun {
  const duration = readMotionDrawerOpenMs();
  const panelFrom = options?.fromTransform ?? DRAWER_OFFSCREEN_TRANSFORM;
  const backdropFrom = options?.fromBackdropOpacity ?? 0;
  panel.style.opacity = "1";
  panel.style.transform = panelFrom;
  backdrop.style.opacity = String(backdropFrom);
  const sampler = sampleEnterTransforms(panel, duration);
  const panelRun = runKeyframes(
    panel,
    [{ transform: panelFrom }, { transform: DRAWER_OPEN_TRANSFORM }],
    duration,
  );
  const backdropRun = runKeyframes(
    backdrop,
    [{ opacity: backdropFrom }, { opacity: 1 }],
    duration,
  );
  return {
    cancel: () => {
      sampler.cancel();
      panelRun.cancel();
      backdropRun.cancel();
    },
    finished: Promise.all([panelRun.finished, backdropRun.finished]).then(() => {
      sampler.cancel();
    }),
  };
}

export function playDrawerExitMotion(
  panel: HTMLElement,
  backdrop: HTMLElement,
): DrawerMotionRun {
  const duration = readMotionDrawerCloseMs();
  panel.style.opacity = "1";
  const panelFrom = readPanelTransform(panel);
  const backdropFrom = readOpacity(backdrop);
  const panelRun = runKeyframes(
    panel,
    [{ transform: panelFrom }, { transform: DRAWER_OFFSCREEN_TRANSFORM }],
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
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("metrio-drawer-motion-debug") !== "1") return;
  const bucket = (window as unknown as { __metrioDrawerMotion?: unknown[] }).__metrioDrawerMotion;
  const entry = { t: performance.now(), event, ...detail };
  if (Array.isArray(bucket)) {
    bucket.push(entry);
  } else {
    (window as unknown as { __metrioDrawerMotion: unknown[] }).__metrioDrawerMotion = [entry];
  }
}

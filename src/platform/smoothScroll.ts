/**
 * Metrio smooth wheel scrolling: the SAME engine and tuning as the https://averquo.app reference
 * (Lenis 1.3.x, `lerp: 0.07, wheelMultiplier: 0.9, smoothWheel: true`).
 *
 * Model: wheel input moves a TARGET; one RAF loop eases the real scroll position toward it, and
 * further input keeps extending the same motion. There is no per-notch animation and no device
 * classifier. One Lenis instance is bound to each canonical vertical scroll owner (main area,
 * drawer body, modal body, scrollable table wrapper); nested owners are routed by Lenis through
 * the event path (`allowNestedScroll`).
 *
 * FAIL-OPEN: Metrio's `virtualScroll` guard returns false (event left untouched → native scroll)
 * for anything the engine should not consume, and any failure to create or run an instance leaves
 * native scrolling in place. Scrollbar drag, keyboard, touch and zoom gestures are never smoothed.
 */
import Lenis from "lenis";

/** Averquo reference values (read from its production bundle). */
export const SMOOTH_SCROLL_LERP = 0.07;
export const SMOOTH_SCROLL_WHEEL_MULTIPLIER = 0.9;

const BOUNDARY_EPSILON_PX = 0.5;
const IDLE_KEEP_ALIVE_MS = 1500;

const instances = new Map<HTMLElement, Lenis>();
let rafId: number | null = null;
let lastWakeAt = 0;
let reducedMotionWatcher: MediaQueryList | null = null;
let manualFrames = false;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function anyAnimating(): boolean {
  for (const lenis of instances.values()) if (lenis.isScrolling) return true;
  return false;
}

/** Advance every instance one frame. Exported for deterministic tests. */
export function stepSmoothScroll(time: number): void {
  for (const lenis of instances.values()) {
    try {
      lenis.raf(time);
    } catch {
      /* a broken instance must not stop the others; native scroll still works */
    }
  }
}

function loop(time: number): void {
  rafId = null;
  if (instances.size === 0) return;
  stepSmoothScroll(time);
  if (anyAnimating() || now() - lastWakeAt < IDLE_KEEP_ALIVE_MS) {
    rafId = window.requestAnimationFrame(loop);
  }
}

/** One shared RAF loop for all owners; it sleeps when nothing has scrolled for a while. */
function wake(): void {
  lastWakeAt = now();
  if (manualFrames || rafId !== null || typeof window === "undefined") return;
  rafId = window.requestAnimationFrame(loop);
}

/** Test seam: drive frames manually instead of with requestAnimationFrame. */
export function setManualFramesForTests(manual: boolean): void {
  manualFrames = manual;
  if (manual && rafId !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function isScrollableOverflow(el: HTMLElement): boolean {
  const overflowY = getComputedStyle(el).overflowY;
  return overflowY === "auto" || overflowY === "scroll";
}

/**
 * Decide whether Lenis may take this event. `false` → Lenis ignores it and WebKit scrolls natively.
 */
function createGuard(el: HTMLElement, getLenis: () => Lenis | undefined) {
  return (data: { deltaX: number; deltaY: number; event: Event }): boolean => {
    try {
      const { deltaX, deltaY, event } = data;
      if (event.type !== "wheel") return false; // touch / pointer stay native
      if ((event as WheelEvent).ctrlKey) return false; // pinch zoom
      if (prefersReducedMotion()) return false;
      if (deltaY === 0 || Math.abs(deltaX) >= Math.abs(deltaY)) return false; // horizontal gestures
      if (!isScrollableOverflow(el)) return false;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= BOUNDARY_EPSILON_PX) return false; // nothing to scroll: native propagation
      const lenis = getLenis();
      if (!lenis) return false;
      const target = lenis.targetScroll;
      if (deltaY < 0 && target <= BOUNDARY_EPSILON_PX) return false; // at top: chain natively
      if (deltaY > 0 && target >= max - BOUNDARY_EPSILON_PX) return false; // at bottom
      wake();
      return true;
    } catch {
      return false; // any error → native
    }
  };
}

function create(el: HTMLElement): Lenis | null {
  try {
    let created: Lenis | undefined;
    created = new Lenis({
      wrapper: el,
      content: el,
      eventsTarget: el,
      lerp: SMOOTH_SCROLL_LERP,
      wheelMultiplier: SMOOTH_SCROLL_WHEEL_MULTIPLIER,
      smoothWheel: true,
      syncTouch: false,
      allowNestedScroll: true,
      // Drawers swap content in place; measure scrollHeight directly instead of observing a node.
      naiveDimensions: true,
      autoResize: false,
      autoRaf: false,
      virtualScroll: createGuard(el, () => created),
    });
    return created;
  } catch {
    return null;
  }
}

function ensureReducedMotionWatcher(): void {
  if (reducedMotionWatcher || typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }
  reducedMotionWatcher = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotionWatcher.addEventListener?.("change", (event) => {
    for (const [el, lenis] of [...instances.entries()]) {
      if (event.matches) {
        lenis.destroy();
        instances.set(el, undefined as unknown as Lenis);
      } else if (!instances.get(el)) {
        const next = create(el);
        if (next) instances.set(el, next);
      }
    }
    for (const [el, lenis] of [...instances.entries()]) if (!lenis) instances.delete(el);
  });
}

export interface SmoothScrollHandle {
  dispose(): void;
}

/** Bind an element as a smooth-wheel scroll owner. Never throws; failure leaves native scroll. */
export function attachSmoothScroll(el: HTMLElement): SmoothScrollHandle {
  const noop = { dispose: () => undefined };
  try {
    if (instances.has(el)) return noop;
    ensureReducedMotionWatcher();
    if (prefersReducedMotion()) return noop; // native browser scrolling only
    const lenis = create(el);
    if (!lenis) return noop;
    instances.set(el, lenis);
    return {
      dispose() {
        const current = instances.get(el);
        if (current) {
          try {
            current.destroy();
          } catch {
            /* ignore */
          }
          instances.delete(el);
        }
      },
    };
  } catch {
    return noop;
  }
}

/** Jump an owner to an exact offset and keep the smooth engine's target in sync (no animation). */
export function setSmoothScrollInstant(el: HTMLElement, top: number): boolean {
  const lenis = instances.get(el);
  if (!lenis) return false;
  try {
    lenis.scrollTo(top, { immediate: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export function hasSmoothScrollOwner(el: HTMLElement): boolean {
  return instances.has(el);
}

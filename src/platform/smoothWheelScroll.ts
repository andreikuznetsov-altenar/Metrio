/**
 * Smooth scrolling for DISCRETE mouse-wheel input on Metrio scroll owners.
 *
 * FAIL-OPEN CONTRACT (never break native scrolling):
 *   `preventDefault()` is called ONLY when the event is a classified coarse wheel notch, the
 *   registered owner can scroll that way, a target was computed and the RAF loop is already
 *   scheduled. Unknown / ambiguous input, non-scrollable owners, boundaries, reduced motion and
 *   any thrown error all leave the event untouched so WebKit scrolls natively.
 *
 * Trackpad / precision scrolling is never touched. Scrollbar drag and keyboard stay native.
 */
import { prefersReducedMotion } from "./scrollBehavior";

export const WHEEL_LINE_PX = 40;
export const WHEEL_PAGE_FACTOR = 0.875;
/** Pixel-mode deltas below this are never treated as a mouse notch. */
export const COARSE_MIN_PIXEL_DELTA = 4;
/** Events closer together than this look like a trackpad stream, not discrete notches. */
export const PRECISION_GAP_MS = 24;
/** After a precision event the whole burst (incl. its momentum tail) stays native. */
export const PRECISION_LATCH_MS = 250;
const TAU_MIN_MS = 38;
const TAU_MAX_MS = 62;
const SETTLE_PX = 0.5;
const WRITE_TOLERANCE_PX = 1.5;
/** After the engine ignored our writes we stay native for this long. */
const DISABLE_AFTER_FAILURE_MS = 4000;

export type WheelKind = "native" | "coarse";

export interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey?: boolean;
}

export interface WheelClassifierState {
  lastEventAt: number | null;
  lastKind: WheelKind | null;
  precisionUntil: number;
}

export function createWheelClassifierState(): WheelClassifierState {
  return { lastEventAt: null, lastKind: null, precisionUntil: 0 };
}

/** Normalizes deltaY to CSS pixels for DOM_DELTA_PIXEL / LINE / PAGE. */
export function normalizeWheelDeltaY(event: WheelLike, pageSize: number): number {
  switch (event.deltaMode) {
    case 1:
      return event.deltaY * WHEEL_LINE_PX;
    case 2:
      return event.deltaY * pageSize * WHEEL_PAGE_FACTOR;
    default:
      return event.deltaY;
  }
}

/**
 * Burst-based, device-signature-free classifier. No Windows-style ±120 `wheelDeltaY` assumption:
 * macOS mice arrive as ordinary pixel-mode events. Mutates `state` (burst latch).
 * Uncertain input is "native"; an event is never held back "while deciding".
 */
export function classifyWheel(
  event: WheelLike,
  now: number,
  state: WheelClassifierState,
): WheelKind {
  const gap = state.lastEventAt === null ? Infinity : now - state.lastEventAt;
  state.lastEventAt = now;
  const kind = classify(event, gap, now, state);
  state.lastKind = kind;
  if (kind === "native") state.precisionUntil = now + PRECISION_LATCH_MS;
  return kind;
}

function classify(
  event: WheelLike,
  gap: number,
  now: number,
  state: WheelClassifierState,
): WheelKind {
  if (event.ctrlKey) return "native"; // pinch-zoom gesture
  if (event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return "native";
  if (now < state.precisionUntil) return "native";
  // Rapid, evenly flowing events are a trackpad stream (or a wheel too fast to smooth).
  if (gap < PRECISION_GAP_MS) return "native";
  if (event.deltaMode === 1 || event.deltaMode === 2) return "coarse";
  // DOM_DELTA_PIXEL: fractional deltas and tiny steps are precision input.
  if (!Number.isInteger(event.deltaY) || !Number.isInteger(event.deltaX)) return "native";
  if (Math.abs(event.deltaY) < COARSE_MIN_PIXEL_DELTA) return "native";
  return "coarse";
}

export interface SmoothWheelDeps {
  raf: (cb: (time: number) => void) => number;
  caf: (id: number) => void;
  now: () => number;
  reducedMotion: () => boolean;
}

function defaultDeps(): SmoothWheelDeps {
  return {
    raf: (cb) => window.requestAnimationFrame(cb),
    caf: (id) => window.cancelAnimationFrame(id),
    now: () => performance.now(),
    reducedMotion: prefersReducedMotion,
  };
}

export interface SmoothWheelController {
  dispose(): void;
  /** True while a wheel animation is in flight. */
  isAnimating(): boolean;
}

// ---- owner registry -------------------------------------------------------------------------

const owners = new WeakSet<Element>();

/** True for elements that registered themselves as a Metrio smooth-wheel scroll owner. */
export function isRegisteredScrollOwner(node: unknown): boolean {
  return node instanceof Element && owners.has(node);
}

// One classification per DOM event, shared by every owner on the propagation path.
const classifierState = createWheelClassifierState();
const classifiedEvents = new WeakMap<Event, WheelKind>();

/** Test seam: the shared burst state must not leak between independent fake clocks. */
export function resetWheelClassifierForTests(): void {
  Object.assign(classifierState, createWheelClassifierState());
}

function classifyOnce(event: WheelEvent, now: number): WheelKind {
  const known = classifiedEvents.get(event);
  if (known) return known;
  const kind = classifyWheel(event, now, classifierState);
  classifiedEvents.set(event, kind);
  return kind;
}

// ---- helpers --------------------------------------------------------------------------------

function maxScroll(el: HTMLElement): number {
  return Math.max(0, el.scrollHeight - el.clientHeight);
}

function isScrollableOverflow(node: HTMLElement): boolean {
  const overflowY = getComputedStyle(node).overflowY;
  return overflowY === "auto" || overflowY === "scroll";
}

function canMove(node: HTMLElement, dir: number): boolean {
  const max = maxScroll(node);
  if (max <= 0) return false;
  return dir > 0 ? node.scrollTop < max - 0.5 : node.scrollTop > 0.5;
}

/**
 * An UNREGISTERED descendant between the pointer and the owner that is genuinely scrollable in
 * this direction (textarea, list, ...). It owns the event natively. Registered owners are skipped:
 * they decide for themselves (their own handler runs first on the bubble path).
 */
function independentChildConsumes(path: EventTarget[], owner: HTMLElement, dir: number): boolean {
  for (const node of path) {
    if (node === owner) return false;
    if (!(node instanceof HTMLElement) || owners.has(node)) continue;
    if (isScrollableOverflow(node) && canMove(node, dir)) return true;
  }
  return false;
}

// ---- controller -----------------------------------------------------------------------------

export function attachSmoothWheelScroll(
  el: HTMLElement,
  overrides: Partial<SmoothWheelDeps> = {},
): SmoothWheelController {
  const deps = { ...defaultDeps(), ...overrides };
  let rafId: number | null = null;
  let position = 0;
  let target = 0;
  let lastFrame = 0;
  let lastWritten = 0;
  let disabledUntil = 0;
  let savedScrollBehavior: string | null = null;

  /**
   * CSS `scroll-behavior: smooth` also smooths scrollTop writes, so per-frame writes would stack a
   * native animation under ours (the loop would fight it and stall). While we own the motion the
   * owner's behavior is forced to `auto`, then restored.
   */
  const takeOverBehavior = () => {
    if (savedScrollBehavior === null) {
      savedScrollBehavior = el.style.scrollBehavior;
      el.style.scrollBehavior = "auto";
    }
  };
  const releaseBehavior = () => {
    if (savedScrollBehavior !== null) {
      el.style.scrollBehavior = savedScrollBehavior;
      savedScrollBehavior = null;
    }
  };

  const cancelFrame = () => {
    if (rafId !== null) {
      try {
        deps.caf(rafId);
      } catch {
        /* nothing to cancel */
      }
      rafId = null;
    }
  };

  /** Stop animating and leave the scroll position wherever it is. */
  const stop = () => {
    cancelFrame();
    releaseBehavior();
  };

  /** Stop animating but honour the movement the user already asked for (no lost input). */
  const finishNow = (force = false) => {
    const wasAnimating = force || rafId !== null;
    cancelFrame();
    if (wasAnimating) {
      try {
        el.scrollTop = Math.min(Math.max(target, 0), maxScroll(el));
      } catch {
        /* native state is already consistent */
      }
    }
    releaseBehavior();
  };

  const failOpen = () => {
    disabledUntil = deps.now() + DISABLE_AFTER_FAILURE_MS;
    finishNow(true);
  };

  const frame = (time: number) => {
    rafId = null;
    try {
      // Someone else moved the owner (scrollbar drag, keyboard, tab reset): yield to them.
      if (Math.abs(el.scrollTop - lastWritten) > WRITE_TOLERANCE_PX) {
        stop();
        return;
      }
      const max = maxScroll(el);
      target = Math.min(Math.max(target, 0), max);
      const dt = Math.min(Math.max(time - lastFrame, 1), 64);
      lastFrame = time;
      const distance = target - position;
      const tau =
        TAU_MIN_MS + (TAU_MAX_MS - TAU_MIN_MS) * Math.min(Math.abs(distance) / 600, 1);
      const step = distance * (1 - Math.exp(-dt / tau));
      position = Math.abs(distance - step) <= SETTLE_PX ? target : position + step;
      el.scrollTop = position;
      const readBack = el.scrollTop;
      // The engine must apply the exact intended offset immediately; if it does not, stop
      // owning motion for a while and complete the movement natively.
      if (Math.abs(readBack - position) > WRITE_TOLERANCE_PX && position !== target) {
        failOpen();
        return;
      }
      lastWritten = readBack;
      if (position !== target) {
        rafId = deps.raf(frame);
      } else {
        releaseBehavior();
      }
    } catch {
      failOpen();
    }
  };

  const onWheel = (event: WheelEvent) => {
    try {
      if (event.defaultPrevented) return; // an inner owner already consumed it
      const now = deps.now();
      if (now < disabledUntil || deps.reducedMotion()) {
        stop();
        return;
      }
      const kind = classifyOnce(event, now);
      if (kind === "native") {
        // Trackpad / ambiguous input takes over immediately; finish what the wheel asked for.
        finishNow();
        return;
      }
      const dy = normalizeWheelDeltaY(event, el.clientHeight);
      if (!Number.isFinite(dy) || dy === 0) return;
      const dir = dy > 0 ? 1 : -1;
      if (!isScrollableOverflow(el)) return; // never smooth a non-scroller
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      if (independentChildConsumes(path, el, dir)) {
        stop();
        return;
      }
      const max = maxScroll(el);
      if (max <= 0) return; // nothing to scroll: native propagation
      const animating = rafId !== null;
      const current = animating ? target : el.scrollTop;
      const next = Math.min(Math.max(current + dy, 0), max);
      if (!animating && Math.abs(next - el.scrollTop) < 0.5) return; // at a boundary: chain natively
      const previous = { position, target, lastFrame, lastWritten };
      if (!animating) {
        position = el.scrollTop;
        lastWritten = el.scrollTop;
        lastFrame = now;
        takeOverBehavior();
      }
      target = next;
      if (!animating) {
        try {
          rafId = deps.raf(frame);
        } catch (error) {
          // Could not schedule: restore state and let WebKit handle this event.
          position = previous.position;
          target = previous.target;
          lastFrame = previous.lastFrame;
          lastWritten = previous.lastWritten;
          releaseBehavior();
          throw error;
        }
      }
      event.preventDefault(); // the RAF loop is committed to this event
    } catch {
      /* any error → native scroll survives */
    }
  };

  const interrupt = () => stop();

  try {
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", interrupt, { passive: true });
    el.addEventListener("keydown", interrupt, { passive: true });
    el.addEventListener("touchstart", interrupt, { passive: true });
    owners.add(el);
  } catch {
    return { isAnimating: () => false, dispose: () => undefined };
  }

  return {
    isAnimating: () => rafId !== null,
    dispose() {
      stop();
      owners.delete(el);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", interrupt);
      el.removeEventListener("keydown", interrupt);
      el.removeEventListener("touchstart", interrupt);
    },
  };
}

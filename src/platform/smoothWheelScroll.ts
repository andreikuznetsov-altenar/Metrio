/**
 * Smooth scrolling for DISCRETE mouse-wheel input on Metrio scroll owners.
 *
 * Native trackpad / precision scrolling is never touched: WebKit/macOS owns its momentum.
 * Only events that classify as coarse wheel notches are intercepted (on the owner element
 * only, never globally), accumulated into one target, and eased toward it with a single
 * requestAnimationFrame loop. Anything ambiguous stays native.
 */
import { prefersReducedMotion } from "./scrollBehavior";

export const WHEEL_LINE_PX = 40;
export const WHEEL_PAGE_FACTOR = 0.875;
/** Pixel-mode deltas below this are never treated as a mouse notch. */
export const COARSE_MIN_PIXEL_DELTA = 4;
/** Notches closer together than this look like a trackpad stream, not discrete clicks. */
export const PRECISION_GAP_MS = 24;
/** After a precision event the whole burst (incl. momentum tail) stays native. */
export const PRECISION_LATCH_MS = 250;
/** Time constant (ms) of the ease-out; scales a little with distance (≈120–220ms settle). */
const TAU_MIN_MS = 38;
const TAU_MAX_MS = 62;
const SETTLE_PX = 0.5;
const EXTERNAL_MOVE_TOLERANCE_PX = 2;

export type WheelKind = "native" | "coarse";

export interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey?: boolean;
  wheelDeltaY?: number;
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
 * Conservative classifier. Mutates `state` (burst latch). Returns "coarse" only for
 * clearly discrete vertical input; trackpad-like, horizontal, zoom and ambiguous events
 * are "native".
 */
export function classifyWheel(
  event: WheelLike,
  now: number,
  state: WheelClassifierState,
): WheelKind {
  const gap = state.lastEventAt === null ? Infinity : now - state.lastEventAt;
  const previousKind = state.lastKind;
  state.lastEventAt = now;

  const kind = classify(event, gap, previousKind, now, state);
  state.lastKind = kind;
  if (kind === "native") state.precisionUntil = now + PRECISION_LATCH_MS;
  return kind;
}

function classify(
  event: WheelLike,
  gap: number,
  previousKind: WheelKind | null,
  now: number,
  state: WheelClassifierState,
): WheelKind {
  if (event.ctrlKey) return "native"; // pinch-zoom gesture
  if (event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return "native";
  if (now < state.precisionUntil) return "native";
  if (event.deltaMode === 1 || event.deltaMode === 2) return "coarse";

  // DOM_DELTA_PIXEL: fractional deltas and tiny steps are precision input.
  if (!Number.isInteger(event.deltaY) || !Number.isInteger(event.deltaX)) return "native";
  if (Math.abs(event.deltaY) < COARSE_MIN_PIXEL_DELTA) return "native";
  // Mouse notches report wheelDeltaY in multiples of 120; trackpads report 3x the pixel delta.
  const wd = event.wheelDeltaY;
  if (typeof wd === "number" && wd !== 0 && Math.abs(wd) % 120 !== 0) return "native";
  // Rapid, evenly flowing events are a trackpad stream, unless we were already mid-wheel.
  if (gap < PRECISION_GAP_MS && previousKind !== "coarse") return "native";
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

function maxScroll(el: HTMLElement): number {
  return Math.max(0, el.scrollHeight - el.clientHeight);
}

function setTop(el: HTMLElement, top: number): void {
  // The owner has `scroll-behavior: smooth`; per-frame writes must be instant.
  if (typeof el.scrollTo === "function") {
    el.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  } else {
    el.scrollTop = top;
  }
}

function canScrollY(node: HTMLElement, dir: number): boolean {
  const max = maxScroll(node);
  if (max <= 0) return false;
  const overflowY = getComputedStyle(node).overflowY;
  if (overflowY !== "auto" && overflowY !== "scroll") return false;
  return dir > 0 ? node.scrollTop < max - 0.5 : node.scrollTop > 0.5;
}

/** An inner (not-owned) scroller under the pointer that can still consume this direction. */
function innerConsumes(target: EventTarget | null, owner: HTMLElement, dir: number): boolean {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== owner) {
    if (canScrollY(node, dir)) return true;
    node = node.parentElement;
  }
  return false;
}

export function attachSmoothWheelScroll(
  el: HTMLElement,
  overrides: Partial<SmoothWheelDeps> = {},
): SmoothWheelController {
  const deps = { ...defaultDeps(), ...overrides };
  const classifier = createWheelClassifierState();
  let rafId: number | null = null;
  let position = 0;
  let target = 0;
  let lastFrame = 0;
  let lastWritten = 0;

  const stop = () => {
    if (rafId !== null) {
      deps.caf(rafId);
      rafId = null;
    }
  };

  const frame = (time: number) => {
    rafId = null;
    const max = maxScroll(el);
    // Someone else moved the owner (scrollbar drag, keyboard, tab reset): yield to them.
    if (Math.abs(el.scrollTop - lastWritten) > EXTERNAL_MOVE_TOLERANCE_PX) return;
    target = Math.min(Math.max(target, 0), max);
    const dt = Math.min(Math.max(time - lastFrame, 1), 64);
    lastFrame = time;
    const distance = target - position;
    const tau =
      TAU_MIN_MS + (TAU_MAX_MS - TAU_MIN_MS) * Math.min(Math.abs(distance) / 600, 1);
    const step = distance * (1 - Math.exp(-dt / tau));
    position = Math.abs(distance - step) <= SETTLE_PX ? target : position + step;
    setTop(el, position);
    lastWritten = el.scrollTop;
    if (position !== target) rafId = deps.raf(frame);
  };

  const onWheel = (event: WheelEvent) => {
    if (event.defaultPrevented) return; // an inner owner already handled it
    if (deps.reducedMotion()) {
      stop();
      return;
    }
    const kind = classifyWheel(event, deps.now(), classifier);
    if (kind === "native") {
      stop(); // trackpad / ambiguous input takes over immediately
      return;
    }
    const dy = normalizeWheelDeltaY(event, el.clientHeight);
    const dir = dy > 0 ? 1 : -1;
    if (innerConsumes(event.target, el, dir)) {
      stop();
      return;
    }
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY !== "auto" && overflowY !== "scroll") return; // never smooth a non-scroller
    const max = maxScroll(el);
    const current = rafId !== null ? target : el.scrollTop;
    const next = Math.min(Math.max(current + dy, 0), max);
    if (max <= 0 || (rafId === null && next === el.scrollTop)) return; // at a boundary: let it chain natively
    event.preventDefault();
    if (rafId === null) {
      position = el.scrollTop;
      lastWritten = el.scrollTop;
      lastFrame = deps.now();
    }
    target = next;
    if (rafId === null) rafId = deps.raf(frame);
  };

  const interrupt = () => stop();

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("pointerdown", interrupt, { passive: true });
  el.addEventListener("keydown", interrupt, { passive: true });
  el.addEventListener("touchstart", interrupt, { passive: true });

  return {
    isAnimating: () => rafId !== null,
    dispose() {
      stop();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", interrupt);
      el.removeEventListener("keydown", interrupt);
      el.removeEventListener("touchstart", interrupt);
    },
  };
}

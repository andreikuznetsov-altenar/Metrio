import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachSmoothWheelScroll,
  classifyWheel,
  createWheelClassifierState,
  normalizeWheelDeltaY,
  type SmoothWheelDeps,
} from "../platform/smoothWheelScroll";

function fakeClock() {
  let t = 1000;
  let nextId = 1;
  const queue = new Map<number, (time: number) => void>();
  const deps: SmoothWheelDeps & { reduced: boolean } = {
    reduced: false,
    raf: (cb) => {
      const id = nextId++;
      queue.set(id, cb);
      return id;
    },
    caf: (id) => void queue.delete(id),
    now: () => t,
    reducedMotion() {
      return deps.reduced;
    },
  };
  return {
    deps,
    advance(ms: number) {
      t += ms;
    },
    pending: () => queue.size,
    /** Runs one frame (16ms) of every queued callback. */
    frame() {
      t += 16;
      const cbs = [...queue.values()];
      queue.clear();
      cbs.forEach((cb) => cb(t));
    },
    settle(max = 120) {
      for (let i = 0; i < max && queue.size > 0; i += 1) this.frame();
    },
  };
}

function scroller(scrollHeight = 2000, clientHeight = 500) {
  const el = document.createElement("div");
  el.style.overflowY = "scroll";
  let top = 0;
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  Object.defineProperty(el, "scrollTop", {
    get: () => top,
    set: (v: number) => {
      top = Math.min(Math.max(v, 0), scrollHeight - clientHeight);
    },
    configurable: true,
  });
  el.scrollTo = ((opts: ScrollToOptions) => {
    el.scrollTop = opts.top ?? 0;
  }) as typeof el.scrollTo;
  document.body.appendChild(el);
  return el;
}

function wheel(el: Element, init: WheelEventInit & { wheelDeltaY?: number }) {
  const ev = new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init });
  if (init.wheelDeltaY !== undefined) {
    Object.defineProperty(ev, "wheelDeltaY", { value: init.wheelDeltaY });
  }
  el.dispatchEvent(ev);
  return ev;
}

const notch = (dy: number) => ({ deltaY: dy, deltaMode: 0, wheelDeltaY: -dy * 3 });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("normalizeWheelDeltaY", () => {
  it("handles pixel, line and page modes", () => {
    expect(normalizeWheelDeltaY({ deltaX: 0, deltaY: 12, deltaMode: 0 }, 500)).toBe(12);
    expect(normalizeWheelDeltaY({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 500)).toBe(120);
    expect(normalizeWheelDeltaY({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 400)).toBe(350);
  });
});

describe("classifyWheel", () => {
  const classify = (e: Parameters<typeof classifyWheel>[0], now = 1000) =>
    classifyWheel(e, now, createWheelClassifierState());

  it("treats line/page mode as discrete wheel", () => {
    expect(classify({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toBe("coarse");
    expect(classify({ deltaX: 0, deltaY: 1, deltaMode: 2 })).toBe("coarse");
  });
  it("treats stepped integer pixel notches as discrete wheel", () => {
    expect(classify({ deltaX: 0, deltaY: 120, deltaMode: 0, wheelDeltaY: -360 })).toBe("coarse");
    expect(classify({ deltaX: 0, deltaY: 40, deltaMode: 0, wheelDeltaY: -120 })).toBe("coarse");
  });
  it("keeps fractional and tiny pixel deltas native (trackpad)", () => {
    expect(classify({ deltaX: 0, deltaY: 3.5, deltaMode: 0 })).toBe("native");
    expect(classify({ deltaX: 0, deltaY: 2, deltaMode: 0 })).toBe("native");
    expect(classify({ deltaX: 0, deltaY: 37, deltaMode: 0, wheelDeltaY: -111 })).toBe("native");
  });
  it("keeps horizontal, diagonal-dominant-x, zoom and zero-y native", () => {
    expect(classify({ deltaX: 90, deltaY: 10, deltaMode: 1 })).toBe("native");
    expect(classify({ deltaX: 0, deltaY: 0, deltaMode: 0 })).toBe("native");
    expect(classify({ deltaX: 0, deltaY: 100, deltaMode: 0, ctrlKey: true })).toBe("native");
  });
  it("latches a trackpad burst as native, including its large-looking tail", () => {
    const state = createWheelClassifierState();
    expect(classifyWheel({ deltaX: 0, deltaY: 5.5, deltaMode: 0 }, 1000, state)).toBe("native");
    expect(classifyWheel({ deltaX: 0, deltaY: 120, deltaMode: 0, wheelDeltaY: -360 }, 1016, state)).toBe(
      "native",
    );
    // After the latch expires a real notch is eligible again.
    expect(classifyWheel({ deltaX: 0, deltaY: 120, deltaMode: 0, wheelDeltaY: -360 }, 1400, state)).toBe(
      "coarse",
    );
  });
  it("treats rapid evenly flowing events as precision unless mid-wheel", () => {
    const state = createWheelClassifierState();
    const e = { deltaX: 0, deltaY: 40, deltaMode: 0, wheelDeltaY: -120 };
    expect(classifyWheel(e, 1000, state)).toBe("coarse");
    expect(classifyWheel(e, 1010, state)).toBe("coarse"); // already mid-wheel
    const fresh = createWheelClassifierState();
    classifyWheel({ deltaX: 0, deltaY: 1, deltaMode: 0 }, 1000, fresh);
    expect(classifyWheel(e, 1010, fresh)).toBe("native");
  });
});

describe("attachSmoothWheelScroll", () => {
  let clock: ReturnType<typeof fakeClock>;
  beforeEach(() => {
    clock = fakeClock();
  });

  it("animates a coarse notch across several frames to its destination", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    const ev = wheel(el, notch(120));
    expect(ev.defaultPrevented).toBe(true);
    expect(el.scrollTop).toBe(0);
    clock.frame();
    const first = el.scrollTop;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(120);
    clock.settle();
    expect(el.scrollTop).toBe(120);
    expect(clock.pending()).toBe(0);
  });

  it("accumulates successive notches into one target without restarting", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(120));
    clock.frame();
    clock.advance(40);
    wheel(el, notch(120));
    clock.frame();
    clock.advance(40);
    wheel(el, notch(120));
    expect(clock.pending()).toBe(1); // a single RAF loop
    clock.settle();
    expect(el.scrollTop).toBe(360);
  });

  it("clamps at bottom and top and lets boundary notches chain natively", () => {
    const el = scroller(700, 500); // max 200
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, { deltaY: 500, deltaMode: 0, wheelDeltaY: -1200 });
    clock.settle();
    expect(el.scrollTop).toBe(200);
    clock.advance(500);
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false);
    wheel(el, notch(-120));
    clock.settle();
    expect(el.scrollTop).toBe(80);
    clock.advance(500);
    wheel(el, { deltaY: -500, deltaMode: 0, wheelDeltaY: 1200 });
    clock.settle();
    expect(el.scrollTop).toBe(0);
    clock.advance(500);
    expect(wheel(el, notch(-120)).defaultPrevented).toBe(false);
  });

  it("reverses direction immediately from the pending target", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(120));
    wheel(el, notch(120));
    clock.frame();
    clock.advance(40);
    wheel(el, notch(-120)); // target 240 -> 120
    clock.settle();
    expect(el.scrollTop).toBe(120);
  });

  it("never intercepts trackpad-like events and cancels an active animation", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(120));
    clock.frame();
    clock.advance(30);
    const track = wheel(el, { deltaY: 7.25, deltaMode: 0 });
    expect(track.defaultPrevented).toBe(false);
    expect(clock.pending()).toBe(0);
    const stoppedAt = el.scrollTop;
    clock.settle();
    expect(el.scrollTop).toBe(stoppedAt);
  });

  it("does nothing under prefers-reduced-motion", () => {
    const el = scroller();
    clock.deps.reduced = true;
    attachSmoothWheelScroll(el, clock.deps);
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false);
    expect(clock.pending()).toBe(0);
  });

  it("yields to external scroll movement (scrollbar drag, keyboard, tab reset)", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(400));
    clock.frame();
    el.scrollTop = 900;
    clock.settle();
    expect(el.scrollTop).toBe(900);
    expect(clock.pending()).toBe(0);
  });

  it("cancels the RAF loop on pointerdown and on dispose", () => {
    const el = scroller();
    const c = attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(400));
    el.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(clock.pending()).toBe(0);
    clock.advance(500);
    wheel(el, notch(400));
    expect(clock.pending()).toBe(1);
    c.dispose();
    expect(clock.pending()).toBe(0);
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false);
  });

  it("does not intercept non-scrolling owners", () => {
    const el = scroller(400, 500);
    attachSmoothWheelScroll(el, clock.deps);
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false);
    const hidden = scroller();
    hidden.style.overflowY = "hidden";
    attachSmoothWheelScroll(hidden, clock.deps);
    expect(wheel(hidden, notch(120)).defaultPrevented).toBe(false);
  });

  it("leaves wheel to an inner scroller that can still consume it", () => {
    const outer = scroller();
    const inner = scroller();
    outer.appendChild(inner);
    inner.scrollTop = 10;
    attachSmoothWheelScroll(outer, clock.deps);
    expect(wheel(inner, notch(120)).defaultPrevented).toBe(false);
    expect(outer.scrollTop).toBe(0);
    inner.scrollTop = 1500; // inner at its bottom: outer takes over
    clock.advance(500);
    expect(wheel(inner, notch(120)).defaultPrevented).toBe(true);
  });

  it("lets an inner smooth owner handle the event once (no double scrolling)", () => {
    const outer = scroller();
    const inner = scroller(1000, 200);
    outer.appendChild(inner);
    attachSmoothWheelScroll(outer, clock.deps);
    attachSmoothWheelScroll(inner, clock.deps);
    wheel(inner, notch(120));
    clock.settle();
    expect(inner.scrollTop).toBe(120);
    expect(outer.scrollTop).toBe(0);
  });
});

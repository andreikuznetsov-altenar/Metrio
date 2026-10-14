import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachSmoothWheelScroll,
  classifyWheel,
  createWheelClassifierState,
  normalizeWheelDeltaY,
  resetWheelClassifierForTests,
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
  document.body.appendChild(el);
  return el;
}

function wheel(el: Element, init: WheelEventInit) {
  const ev = new WheelEvent("wheel", { bubbles: true, cancelable: true, composed: true, ...init });
  el.dispatchEvent(ev);
  return ev;
}

/** Pixel-mode, mac-mouse-like notch: no wheelDeltaY signature is involved or required. */
const notch = (dy: number) => ({ deltaY: dy, deltaMode: 0 });

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

describe("classifyWheel (burst based, no ±120 signature)", () => {
  const first = (e: Parameters<typeof classifyWheel>[0]) =>
    classifyWheel(e, 1000, createWheelClassifierState());

  it("line/page mode is discrete wheel", () => {
    expect(first({ deltaX: 0, deltaY: 3, deltaMode: 1 })).toBe("coarse");
    expect(first({ deltaX: 0, deltaY: 1, deltaMode: 2 })).toBe("coarse");
  });

  it("plausible macOS pixel-mode mouse notches are eligible whatever their magnitude", () => {
    for (const dy of [4, 5, 8, 10, 16, 24, 40, 53, 100, 120, -8, -40]) {
      expect(first({ deltaX: 0, deltaY: dy, deltaMode: 0 }), `deltaY ${dy}`).toBe("coarse");
    }
  });

  it("a slow, accelerated mac-mouse sequence stays eligible (gaps ≥ 24ms)", () => {
    const state = createWheelClassifierState();
    const seq: Array<[number, number]> = [
      [1000, 4],
      [1110, 6],
      [1190, 12],
      [1250, 24],
      [1320, 40],
      [1400, 60],
    ];
    expect(seq.map(([t, dy]) => classifyWheel({ deltaX: 0, deltaY: dy, deltaMode: 0 }, t, state))).toEqual(
      Array(6).fill("coarse"),
    );
  });

  it("a reversed direction mid-sequence stays eligible", () => {
    const state = createWheelClassifierState();
    expect(classifyWheel({ deltaX: 0, deltaY: 12, deltaMode: 0 }, 1000, state)).toBe("coarse");
    expect(classifyWheel({ deltaX: 0, deltaY: -12, deltaMode: 0 }, 1100, state)).toBe("coarse");
  });

  it("fractional and tiny pixel deltas are precision (native)", () => {
    expect(first({ deltaX: 0, deltaY: 3.5, deltaMode: 0 })).toBe("native");
    expect(first({ deltaX: 0, deltaY: 2, deltaMode: 0 })).toBe("native");
    expect(first({ deltaX: 0, deltaY: 0, deltaMode: 0 })).toBe("native");
  });

  it("horizontal-dominant and zoom gestures are native", () => {
    expect(first({ deltaX: 90, deltaY: 10, deltaMode: 1 })).toBe("native");
    expect(first({ deltaX: 0, deltaY: 100, deltaMode: 0, ctrlKey: true })).toBe("native");
  });

  it("a trackpad stream (≤16ms gaps, small ints with a momentum tail) never turns coarse", () => {
    const state = createWheelClassifierState();
    const kinds: string[] = [];
    let t = 1000;
    for (const dy of [30, 22, 18, 14, 9, 6, 4, 4, 5, 3.5, 2.5, 1.5]) {
      kinds.push(classifyWheel({ deltaX: 0, deltaY: dy, deltaMode: 0 }, t, state));
      t += 16;
    }
    // Only the very first event after idle can look discrete; everything after is native.
    expect(kinds.slice(1).every((k) => k === "native")).toBe(true);
  });

  it("a precision burst latches native, then a later real notch is eligible again", () => {
    const state = createWheelClassifierState();
    classifyWheel({ deltaX: 0, deltaY: 5.5, deltaMode: 0 }, 1000, state);
    expect(classifyWheel({ deltaX: 0, deltaY: 120, deltaMode: 0 }, 1100, state)).toBe("native");
    expect(classifyWheel({ deltaX: 0, deltaY: 120, deltaMode: 0 }, 1600, state)).toBe("coarse");
  });
});

describe("attachSmoothWheelScroll", () => {
  let clock: ReturnType<typeof fakeClock>;
  beforeEach(() => {
    clock = fakeClock();
    resetWheelClassifierForTests();
  });

  it("FIRST notch moves content: prevented, animated across frames, lands on target", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    const ev = wheel(el, notch(40));
    expect(ev.defaultPrevented).toBe(true);
    expect(clock.pending()).toBe(1);
    clock.frame();
    expect(el.scrollTop).toBeGreaterThan(0);
    expect(el.scrollTop).toBeLessThan(40);
    clock.settle();
    expect(el.scrollTop).toBe(40);
    expect(clock.pending()).toBe(0);
  });

  it("bypasses CSS scroll-behavior while animating (no stacked smooth animation) and restores it", () => {
    const el = scroller();
    el.style.scrollBehavior = "smooth";
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(120));
    expect(el.style.scrollBehavior).toBe("auto");
    clock.frame();
    expect(el.style.scrollBehavior).toBe("auto");
    clock.settle();
    expect(el.style.scrollBehavior).toBe("smooth");
  });

  it("accumulates successive notches into one target without restarting", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(40));
    clock.frame();
    clock.advance(40);
    wheel(el, notch(40));
    clock.frame();
    clock.advance(40);
    wheel(el, notch(40));
    expect(clock.pending()).toBe(1);
    clock.settle();
    expect(el.scrollTop).toBe(120);
  });

  it("clamps at bottom/top; a boundary notch is NOT prevented (native propagation)", () => {
    const el = scroller(700, 500); // max 200
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(500));
    clock.settle();
    expect(el.scrollTop).toBe(200);
    clock.advance(500);
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false); // C: at bottom, scrolling down
    clock.advance(500);
    wheel(el, notch(-120));
    clock.settle();
    expect(el.scrollTop).toBe(80);
    clock.advance(500);
    wheel(el, notch(-500));
    clock.settle();
    expect(el.scrollTop).toBe(0);
    clock.advance(500);
    expect(wheel(el, notch(-120)).defaultPrevented).toBe(false);
  });

  it("reverses direction immediately from the pending target", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(120));
    clock.advance(40);
    wheel(el, notch(120));
    clock.frame();
    clock.advance(40);
    wheel(el, notch(-120));
    clock.settle();
    expect(el.scrollTop).toBe(120);
  });

  it("trackpad-like input is never prevented and does not start RAF", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    for (const dy of [3.5, 7.25, 11.75, 2.5]) {
      expect(wheel(el, { deltaY: dy, deltaMode: 0 }).defaultPrevented).toBe(false);
      clock.advance(16);
    }
    expect(clock.pending()).toBe(0);
  });

  it("a trackpad stream starting like a notch hands over without losing movement", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    expect(wheel(el, notch(40)).defaultPrevented).toBe(true); // looks like a notch…
    clock.advance(16);
    expect(wheel(el, notch(30)).defaultPrevented).toBe(false); // …but the cadence is a trackpad's
    expect(clock.pending()).toBe(0);
    expect(el.scrollTop).toBe(40); // the first event's movement was completed, not dropped
  });

  it("A. unknown signature (tiny / fractional) → native, not prevented", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, clock.deps);
    expect(wheel(el, { deltaY: 1, deltaMode: 0 }).defaultPrevented).toBe(false);
    clock.advance(500);
    expect(wheel(el, { deltaY: 17.3, deltaMode: 0 }).defaultPrevented).toBe(false);
  });

  it("B. owner cannot scroll → native, not prevented", () => {
    const el = scroller(400, 500);
    attachSmoothWheelScroll(el, clock.deps);
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false);
    const hidden = scroller();
    hidden.style.overflowY = "hidden";
    attachSmoothWheelScroll(hidden, clock.deps);
    clock.advance(500);
    expect(wheel(hidden, notch(120)).defaultPrevented).toBe(false);
  });

  it("D. a controller that cannot schedule (raf throws) leaves the event native", () => {
    const el = scroller();
    attachSmoothWheelScroll(el, {
      ...clock.deps,
      raf: () => {
        throw new Error("no raf");
      },
    });
    const ev = wheel(el, notch(120));
    expect(ev.defaultPrevented).toBe(false);
    expect(el.style.scrollBehavior).toBe("");
  });

  it("D. a throwing frame fails open: movement is completed, native afterwards", () => {
    const el = scroller();
    let throwNext = false;
    const top = Object.getOwnPropertyDescriptor(el, "scrollTop")!;
    Object.defineProperty(el, "scrollTop", {
      configurable: true,
      get: () => top.get!.call(el),
      set: (v: number) => {
        if (throwNext) {
          throwNext = false;
          throw new Error("write failed");
        }
        top.set!.call(el, v);
      },
    });
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(120));
    throwNext = true;
    clock.frame();
    expect(clock.pending()).toBe(0);
    expect(el.scrollTop).toBe(120);
    // disabled for a while → native
    clock.advance(100);
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false);
  });

  it("an engine that ignores the exact frame write fails open and finishes the move instantly", () => {
    const el = scroller();
    const top = Object.getOwnPropertyDescriptor(el, "scrollTop")!;
    let ignoreWrites = false;
    Object.defineProperty(el, "scrollTop", {
      configurable: true,
      get: () => top.get!.call(el),
      set: (v: number) => {
        if (ignoreWrites) {
          ignoreWrites = false; // only the per-frame write is swallowed (WebKit began its own animation)
          return;
        }
        top.set!.call(el, v);
      },
    });
    attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(400));
    ignoreWrites = true;
    clock.frame();
    expect(clock.pending()).toBe(0);
    expect(el.scrollTop).toBe(400);
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

  it("cancels the RAF loop on pointerdown and on dispose, restoring behavior", () => {
    const el = scroller();
    el.style.scrollBehavior = "smooth";
    const c = attachSmoothWheelScroll(el, clock.deps);
    wheel(el, notch(400));
    el.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(clock.pending()).toBe(0);
    expect(el.style.scrollBehavior).toBe("smooth");
    clock.advance(500);
    wheel(el, notch(400));
    expect(clock.pending()).toBe(1);
    c.dispose();
    expect(clock.pending()).toBe(0);
    expect(el.style.scrollBehavior).toBe("smooth");
    expect(wheel(el, notch(120)).defaultPrevented).toBe(false);
  });
});

describe("registered owner routing", () => {
  let clock: ReturnType<typeof fakeClock>;
  beforeEach(() => {
    clock = fakeClock();
    resetWheelClassifierForTests();
  });

  it("E. a wheel over a NON-scrolling child inside a drawer-like owner scrolls the owner", () => {
    const body = scroller(2000, 400);
    const content = document.createElement("div");
    const section = document.createElement("section");
    const leaf = document.createElement("p");
    section.appendChild(leaf);
    content.appendChild(section);
    body.appendChild(content);
    attachSmoothWheelScroll(body, clock.deps);
    const ev = wheel(leaf, notch(40));
    expect(ev.defaultPrevented).toBe(true);
    clock.settle();
    expect(body.scrollTop).toBe(40);
  });

  it("a child with overflow:auto that does NOT actually overflow does not block the owner", () => {
    const body = scroller(2000, 400);
    const child = scroller(100, 100); // overflow-y: scroll style but nothing to scroll
    body.appendChild(child);
    attachSmoothWheelScroll(body, clock.deps);
    wheel(child, notch(40));
    clock.settle();
    expect(body.scrollTop).toBe(40);
  });

  it("an independently scrollable unregistered child scrolls first (native)", () => {
    const outer = scroller();
    const inner = scroller(1000, 200);
    outer.appendChild(inner);
    attachSmoothWheelScroll(outer, clock.deps);
    expect(wheel(inner, notch(40)).defaultPrevented).toBe(false);
    expect(outer.scrollTop).toBe(0);
  });

  it("nested boundary: inner registered owner at its limit is NOT prevented, outer then takes the event", () => {
    const outer = scroller(2000, 500);
    const inner = scroller(700, 500); // max 200
    outer.appendChild(inner);
    attachSmoothWheelScroll(outer, clock.deps);
    attachSmoothWheelScroll(inner, clock.deps);
    inner.scrollTop = 200; // inner at its bottom
    const ev = wheel(inner, notch(40));
    expect(ev.defaultPrevented).toBe(true); // outer consumed it (inner did not eat it first)
    clock.settle();
    expect(outer.scrollTop).toBe(40);
    expect(inner.scrollTop).toBe(200);
  });

  it("an inner registered owner that CAN scroll owns the event; the outer does not also move", () => {
    const outer = scroller();
    const inner = scroller(1000, 200);
    outer.appendChild(inner);
    attachSmoothWheelScroll(outer, clock.deps);
    attachSmoothWheelScroll(inner, clock.deps);
    wheel(inner, notch(40));
    clock.settle();
    expect(inner.scrollTop).toBe(40);
    expect(outer.scrollTop).toBe(0);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SMOOTH_SCROLL_LERP,
  SMOOTH_SCROLL_WHEEL_MULTIPLIER,
  attachSmoothScroll,
  setManualFramesForTests,
  setSmoothScrollInstant,
  stepSmoothScroll,
} from "../platform/smoothScroll";

let t = 1000;
/** Advance `ms` of fake time in 16ms frames. */
function frames(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) {
    t += 16;
    stepSmoothScroll(t);
  }
}

function scroller(scrollHeight = 4000, clientHeight = 500) {
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
  el.scrollTo = ((o: ScrollToOptions) => {
    el.scrollTop = o.top ?? 0;
  }) as typeof el.scrollTo;
  document.body.appendChild(el);
  return el;
}

function wheel(el: Element, init: WheelEventInit) {
  const ev = new WheelEvent("wheel", { bubbles: true, cancelable: true, composed: true, ...init });
  el.dispatchEvent(ev);
  return ev;
}

const handles: Array<{ dispose(): void }> = [];
const attach = (el: HTMLElement) => {
  const h = attachSmoothScroll(el);
  handles.push(h);
  return h;
};

beforeEach(() => {
  t = 1000;
  setManualFramesForTests(true);
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => {
  handles.splice(0).forEach((h) => h.dispose());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("reference parity", () => {
  it("uses the Averquo values", () => {
    expect(SMOOTH_SCROLL_LERP).toBe(0.09);
    expect(SMOOTH_SCROLL_WHEEL_MULTIPLIER).toBe(0.9);
  });
});

describe("continuous interpolation (not per-notch animation)", () => {
  it("one wheel input: start < intermediate < later < settled ≈ target", () => {
    const el = scroller();
    attach(el);
    frames(16);
    const ev = wheel(el, { deltaY: 100, deltaMode: 0 });
    expect(ev.defaultPrevented).toBe(true);
    const target = 100 * SMOOTH_SCROLL_WHEEL_MULTIPLIER;
    expect(el.scrollTop).toBe(0); // nothing jumps at event time
    frames(16);
    const a = el.scrollTop;
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(target);
    frames(160);
    const b = el.scrollTop;
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(target);
    frames(3000);
    expect(el.scrollTop).toBeCloseTo(target, 0);
  });

  it("several inputs extend the SAME motion: the target accumulates, no restart", () => {
    const el = scroller();
    attach(el);
    frames(16);
    wheel(el, { deltaY: 100, deltaMode: 0 });
    frames(48);
    const mid = el.scrollTop;
    wheel(el, { deltaY: 100, deltaMode: 0 });
    frames(32);
    wheel(el, { deltaY: 100, deltaMode: 0 });
    // keeps moving forward monotonically while new input arrives
    const samples: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      frames(16);
      samples.push(el.scrollTop);
    }
    expect(samples.every((v, i) => i === 0 || v >= samples[i - 1]!)).toBe(true);
    expect(samples[0]).toBeGreaterThan(mid);
    frames(4000);
    expect(el.scrollTop).toBeCloseTo(300 * SMOOTH_SCROLL_WHEEL_MULTIPLIER, 0);
  });

  it("direction reversal retargets immediately and eases back", () => {
    const el = scroller();
    attach(el);
    frames(16);
    wheel(el, { deltaY: 200, deltaMode: 0 });
    frames(64);
    const peakish = el.scrollTop;
    wheel(el, { deltaY: -200, deltaMode: 0 });
    frames(16);
    const after = el.scrollTop;
    expect(after).toBeLessThan(peakish + 40); // no longer being driven toward +180
    frames(4000);
    expect(el.scrollTop).toBeCloseTo(0, 0);
  });

  it("line mode is normalized to pixels", () => {
    const el = scroller();
    attach(el);
    frames(16);
    wheel(el, { deltaY: 3, deltaMode: 1 });
    frames(4000);
    expect(el.scrollTop).toBeGreaterThan(20);
  });
});

describe("fail-open guard", () => {
  it("leaves the event native when the owner cannot scroll", () => {
    const el = scroller(400, 500);
    attach(el);
    frames(16);
    expect(wheel(el, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(false);
  });

  it("leaves it native when the owner is not a scroller (overflow hidden)", () => {
    const el = scroller();
    el.style.overflowY = "hidden";
    attach(el);
    frames(16);
    expect(wheel(el, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(false);
  });

  it("boundaries are native so the event can chain outward", () => {
    const el = scroller(700, 500); // max 200
    attach(el);
    frames(16);
    expect(wheel(el, { deltaY: -100, deltaMode: 0 }).defaultPrevented).toBe(false); // at top
    wheel(el, { deltaY: 900, deltaMode: 0 });
    frames(4000);
    expect(el.scrollTop).toBe(200);
    expect(wheel(el, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(false); // at bottom
  });

  it("horizontal-dominant gestures and Ctrl+wheel stay native", () => {
    const el = scroller();
    attach(el);
    frames(16);
    expect(wheel(el, { deltaX: 80, deltaY: 10, deltaMode: 0 }).defaultPrevented).toBe(false);
    expect(wheel(el, { deltaY: 80, deltaMode: 0, ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it("reduced motion: no engine at all, native scrolling", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: true,
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const el = scroller();
    attach(el);
    frames(16);
    expect(wheel(el, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(false);
  });

  it("a throwing guard environment never swallows the wheel (getComputedStyle failure)", () => {
    const el = scroller();
    attach(el);
    frames(16);
    const spy = vi.spyOn(window, "getComputedStyle").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(wheel(el, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(false);
    spy.mockRestore();
  });

  it("dispose removes the engine: afterwards events are native", () => {
    const el = scroller();
    const h = attach(el);
    frames(16);
    h.dispose();
    expect(wheel(el, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(false);
  });
});

describe("owner routing", () => {
  it("a wheel over a deeply nested NON-scrolling child scrolls the owner (drawer body case)", () => {
    const body = scroller();
    const card = document.createElement("div");
    const leaf = document.createElement("span");
    card.appendChild(leaf);
    body.appendChild(card);
    attach(body);
    frames(16);
    expect(wheel(leaf, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(true);
    frames(3000);
    expect(body.scrollTop).toBeGreaterThan(50);
  });

  it("an independently scrollable child wins while it can scroll; the owner does not move", () => {
    const outer = scroller();
    const inner = scroller(1000, 200);
    outer.appendChild(inner);
    attach(outer);
    frames(16);
    expect(wheel(inner, { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(false);
    frames(3000);
    expect(outer.scrollTop).toBe(0);
  });
});

describe("programmatic reset", () => {
  it("setSmoothScrollInstant jumps and resets the target (no easing toward the old one)", () => {
    const el = scroller();
    attach(el);
    frames(16);
    wheel(el, { deltaY: 500, deltaMode: 0 });
    frames(48);
    expect(setSmoothScrollInstant(el, 0)).toBe(true);
    expect(el.scrollTop).toBe(0);
    frames(2000);
    expect(el.scrollTop).toBe(0);
  });

  it("returns false for elements that are not smooth owners", () => {
    expect(setSmoothScrollInstant(scroller(), 10)).toBe(false);
  });
});

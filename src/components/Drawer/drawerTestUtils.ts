import { act } from "@testing-library/react";
import { vi, type Mock } from "vitest";
import { APP_DRAWER_LAYER_ID } from "./drawerPortal";

const motionFinishQueue: Array<() => void> = [];

export function ensureAppDrawerLayer(): HTMLElement {
  const existing = document.getElementById(APP_DRAWER_LAYER_ID);
  if (existing) {
    return existing;
  }
  const layer = document.createElement("div");
  layer.id = APP_DRAWER_LAYER_ID;
  layer.className = "app-drawer-layer";
  document.body.appendChild(layer);
  return layer;
}

export function installDrawerMotionMock(): Mock {
  motionFinishQueue.length = 0;
  const animate = vi.fn().mockImplementation(function (
    this: Element,
    keyframes: Keyframe[],
    _options: KeyframeAnimationOptions,
  ) {
    const el = this as HTMLElement;
    const first = keyframes[0];
    const last = keyframes[keyframes.length - 1];
    if (first?.transform) {
      el.style.transform = String(first.transform);
    }
    if (first?.opacity !== undefined) {
      el.style.opacity = String(first.opacity);
    }
    const finished = new Promise<void>((resolve) => {
      motionFinishQueue.push(() => {
        if (last?.transform) {
          el.style.transform = String(last.transform);
        }
        if (last?.opacity !== undefined) {
          el.style.opacity = String(last.opacity);
        }
        resolve();
      });
    });
    return {
      cancel: vi.fn(),
      finished,
      playState: "running",
    };
  });
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  return animate;
}

export async function flushDrawerOpenFrames() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

export async function flushDrawerCloseFrames() {
  await flushDrawerOpenFrames();
}

export async function flushDrawerAnimations() {
  await act(async () => {
    while (motionFinishQueue.length > 0) {
      const finish = motionFinishQueue.shift();
      finish?.();
    }
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** @deprecated WAAPI lifecycle — use flushDrawerAnimations */
export function dispatchDrawerPanelTransitionEnd(panel: HTMLElement) {
  const event = new Event("transitionend", { bubbles: true }) as TransitionEvent;
  Object.defineProperty(event, "propertyName", { value: "transform" });
  Object.defineProperty(event, "target", { value: panel });
  panel.dispatchEvent(event);
}

export function readDrawerPanelTransform(panel: HTMLElement): string {
  return getComputedStyle(panel).transform;
}

/** Normalized horizontal offset for motion assertions (jsdom uses translate3d, not matrix). */
export function readDrawerPanelTranslateX(panel: HTMLElement): number {
  const transform = readDrawerPanelTransform(panel);
  if (transform === "none") {
    return 0;
  }
  const matrix = transform.match(
    /matrix\([^,]+, [^,]+, [^,]+, [^,]+, ([^,]+),/,
  );
  if (matrix) {
    return Number(matrix[1]);
  }
  const translate3d = transform.match(/translate3d\(([^,]+)/);
  if (translate3d) {
    const token = translate3d[1].trim();
    if (token.endsWith("%")) {
      return Number(token.replace("%", ""));
    }
    return Number(token);
  }
  return 0;
}

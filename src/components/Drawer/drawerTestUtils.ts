import { act } from "@testing-library/react";
import { vi, type Mock } from "vitest";
import { APP_DRAWER_LAYER_ID } from "./drawerPortal";
import { APP_MODAL_LAYER_ID } from "../Modal/modalPortal";

const motionFinishQueue: Array<() => void> = [];
const motionInstances: Array<{
  el: HTMLElement;
  keyframes: Keyframe[];
  duration: number;
  progress: number;
}> = [];

function applyMotionProgress(
  el: HTMLElement,
  keyframes: Keyframe[],
  _duration: number,
  progress: number,
) {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  const t = Math.max(0, Math.min(1, progress));
  if (first?.transform && last?.transform) {
    const from = String(first.transform);
    const to = String(last.transform);
    if (from.includes("%") && to.includes("%")) {
      const fromPct = Number(from.match(/translate3d\(([-\d.]+)%/)?.[1] ?? 0);
      const toPct = Number(to.match(/translate3d\(([-\d.]+)%/)?.[1] ?? 0);
      const value = fromPct + (toPct - fromPct) * t;
      el.style.transform = `translate3d(${value}%, 0, 0)`;
    } else {
      el.style.transform = t < 1 ? from : to;
    }
  }
  if (first?.opacity !== undefined && last?.opacity !== undefined) {
    const from = Number(first.opacity);
    const to = Number(last.opacity);
    el.style.opacity = String(from + (to - from) * t);
  }
}

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

export function ensureAppModalLayer(): HTMLElement {
  const existing = document.getElementById(APP_MODAL_LAYER_ID);
  if (existing) {
    return existing;
  }
  const layer = document.createElement("div");
  layer.id = APP_MODAL_LAYER_ID;
  layer.className = "app-modal-layer";
  document.body.appendChild(layer);
  return layer;
}

export function ensureAppShellWithOverlayLayers(): {
  shell: HTMLElement;
  header: HTMLElement;
  nativeTitlebar: HTMLElement;
} {
  const nativeTitlebar = document.createElement("div");
  nativeTitlebar.dataset.testid = "native-titlebar";
  nativeTitlebar.style.height = "28px";
  document.body.appendChild(nativeTitlebar);

  const shell = document.createElement("div");
  shell.className = "app-shell";
  shell.style.position = "relative";
  shell.style.height = "400px";
  shell.style.marginTop = "0";

  const header = document.createElement("header");
  header.className = "app-shell__header";
  header.style.height = "48px";

  const drawerLayer = document.createElement("div");
  drawerLayer.id = APP_DRAWER_LAYER_ID;
  drawerLayer.className = "app-drawer-layer";

  const modalLayer = document.createElement("div");
  modalLayer.id = APP_MODAL_LAYER_ID;
  modalLayer.className = "app-modal-layer";

  shell.append(header, drawerLayer, modalLayer);
  document.body.appendChild(shell);
  return { shell, header, nativeTitlebar };
}

export function installDrawerMotionMock(): Mock {
  motionFinishQueue.length = 0;
  motionInstances.length = 0;
  const animate = vi.fn().mockImplementation(function (
    this: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    const el = this as HTMLElement;
    const duration = Number(options.duration ?? 320);
    const record = { el, keyframes, duration, progress: 0 };
    motionInstances.push(record);
    applyMotionProgress(el, keyframes, duration, 0);
    const finished = new Promise<void>((resolve) => {
      motionFinishQueue.push(() => {
        record.progress = 1;
        applyMotionProgress(el, keyframes, duration, 1);
        resolve();
      });
    });
    return {
      cancel: vi.fn(),
      finished,
      playState: "running",
      commitStyles: vi.fn(),
    };
  });
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  return animate;
}

export async function setDrawerMotionProgress(progress: number) {
  await act(async () => {
    for (const record of motionInstances) {
      record.progress = progress;
      applyMotionProgress(record.el, record.keyframes, record.duration, progress);
    }
  });
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
  const inline = panel.style.transform;
  const translate3dInline = inline.match(/translate3d\(([^,]+)/);
  if (translate3dInline) {
    const token = translate3dInline[1].trim();
    if (token.endsWith("%")) {
      return Number(token.replace("%", ""));
    }
    return Number(token);
  }
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

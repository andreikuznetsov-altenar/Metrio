import { act } from "@testing-library/react";
import { APP_DRAWER_LAYER_ID } from "./drawerPortal";

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

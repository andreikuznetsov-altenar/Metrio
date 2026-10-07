import { act } from "@testing-library/react";

export async function flushDrawerOpenFrames() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

export function dispatchDrawerPanelTransitionEnd(panel: HTMLElement) {
  const event = new Event("transitionend", { bubbles: true }) as TransitionEvent;
  Object.defineProperty(event, "propertyName", { value: "transform" });
  Object.defineProperty(event, "target", { value: panel });
  panel.dispatchEvent(event);
}

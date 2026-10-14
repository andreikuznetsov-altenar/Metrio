import { useCallback, useRef } from "react";
import { attachSmoothWheelScroll, type SmoothWheelController } from "./smoothWheelScroll";

/**
 * Registers one scroll owner with the shared smooth-wheel controller for as long as the element
 * is mounted. A callback ref (not an effect) so owners that mount later (open drawers/modals)
 * attach and clean up exactly with the element. Initialization failure leaves native scrolling.
 */
export function useSmoothWheelScroll<T extends HTMLElement = HTMLDivElement>() {
  const controller = useRef<SmoothWheelController | null>(null);
  return useCallback((el: T | null) => {
    try {
      controller.current?.dispose();
    } catch {
      /* ignore */
    }
    controller.current = null;
    if (!el) return;
    try {
      controller.current = attachSmoothWheelScroll(el);
    } catch {
      controller.current = null;
    }
  }, []);
}

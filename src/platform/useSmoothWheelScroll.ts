import { useCallback, useRef } from "react";
import { attachSmoothWheelScroll, type SmoothWheelController } from "./smoothWheelScroll";

/**
 * Binds the shared smooth-wheel controller to one scroll owner for as long as that element is
 * mounted. A callback ref (not an effect) so owners that mount later (open drawers/modals)
 * and unmount (close) attach and clean up exactly with the element.
 */
export function useSmoothWheelScroll<T extends HTMLElement = HTMLDivElement>() {
  const controller = useRef<SmoothWheelController | null>(null);
  return useCallback((el: T | null) => {
    controller.current?.dispose();
    controller.current = el ? attachSmoothWheelScroll(el) : null;
  }, []);
}

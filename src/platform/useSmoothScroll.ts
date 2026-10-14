import { useCallback, useRef } from "react";
import { attachSmoothScroll, type SmoothScrollHandle } from "./smoothScroll";

/**
 * Registers one scroll owner with the shared smooth-scroll engine for as long as the element is
 * mounted (callback ref, so late-mounting drawers/modals attach and clean up with the element).
 */
export function useSmoothScroll<T extends HTMLElement = HTMLDivElement>() {
  const handle = useRef<SmoothScrollHandle | null>(null);
  return useCallback((el: T | null) => {
    try {
      handle.current?.dispose();
    } catch {
      /* ignore */
    }
    handle.current = null;
    if (el) handle.current = attachSmoothScroll(el);
  }, []);
}

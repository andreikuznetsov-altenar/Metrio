import { setSmoothScrollInstant } from "./smoothScroll";

/**
 * Behavior for APP-DRIVEN scrolling (scrollIntoView / scrollBy / scrollTo). User wheel smoothing is
 * owned by `smoothScroll.ts`; this file only decides how Metrio's own navigation scrolls.
 * Reduced-motion users get an immediate jump.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Smooth for deliberate "go to that item" jumps; `auto` when motion is reduced. */
export function smoothScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

/**
 * Deterministic resets (new drawer, restored per-view position) must never animate through
 * unrelated content, even though the container has `scroll-behavior: smooth`.
 */
export function scrollToInstant(el: Element, top: number): void {
  // An owner driven by the smooth-scroll engine must have its target reset too, or it would keep
  // easing toward the pre-jump target.
  if (el instanceof HTMLElement && setSmoothScrollInstant(el, top)) return;
  if (typeof el.scrollTo === "function") {
    el.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  } else {
    el.scrollTop = top;
  }
}

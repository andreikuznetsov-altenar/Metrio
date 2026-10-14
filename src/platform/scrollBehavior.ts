/**
 * Behavior for APP-DRIVEN scrolling (scrollIntoView / scrollBy / scrollTo). Native wheel and
 * trackpad scrolling is never intercepted. Reduced-motion users get an immediate jump.
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
  if (typeof el.scrollTo === "function") {
    el.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  } else {
    el.scrollTop = top;
  }
}

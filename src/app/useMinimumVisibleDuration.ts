import { useEffect, useRef, useState } from "react";

/** Keeps `active` true for at least `minMs` after it turns on (reduces loader flicker). */
export function useMinimumVisibleDuration(
  active: boolean,
  minMs: number,
): boolean {
  const [visible, setVisible] = useState(false);
  const activeSinceRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      activeSinceRef.current = Date.now();
      setVisible(true);
      return;
    }
    if (!visible || activeSinceRef.current === null) {
      return;
    }
    const elapsed = Date.now() - activeSinceRef.current;
    const remaining = minMs - elapsed;
    if (remaining <= 0) {
      activeSinceRef.current = null;
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => {
      activeSinceRef.current = null;
      setVisible(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [active, minMs, visible]);

  return visible;
}

import { useEffect, useState } from "react";

export function markPerformanceTabSwitch(view: string): void {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") {
    return;
  }
  performance.mark("metrio-perf-tab-start");
  performance.mark(`metrio-perf-tab:${view}`);
}

export function markPerformanceTabContent(view: string): void {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") {
    return;
  }
  performance.mark(`metrio-perf-tab-content:${view}`);
}

/** Selected tab paints immediately. Heavy body follows on the next commit. */
export function usePaintedSelection<T>(selected: T): T | null {
  const [painted, setPainted] = useState<T | null>(null);
  useEffect(() => {
    setPainted(selected);
  }, [selected]);
  return painted;
}

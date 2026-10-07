import { useEffect, useState } from "react";

/** Keep visited views mounted (hidden) so internal tab switches stay a UI transition. */
export function useKeepMountedView<T extends string>(active: T): T[] {
  const [mounted, setMounted] = useState<T[]>([active]);

  useEffect(() => {
    setMounted((current) => (current.includes(active) ? current : [...current, active]));
  }, [active]);

  return mounted;
}

export function markPerformanceTabSwitch(view: string): void {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") {
    return;
  }
  performance.mark("metrio-perf-tab-start");
  performance.mark(`metrio-perf-tab:${view}`);
}

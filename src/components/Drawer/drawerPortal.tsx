import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** App-level drawer layer (not nested in page scroll / filter containers). */
export function portalDrawerSurface(node: ReactNode): ReactNode {
  if (typeof document === "undefined") {
    return node;
  }
  return createPortal(node, document.body);
}

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export const APP_DRAWER_LAYER_ID = "app-drawer-layer";

/** Shared app-shell drawer layer (below header, above filters + content). */
export function getAppDrawerPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("Drawer portal requires document");
  }
  const layer = document.getElementById(APP_DRAWER_LAYER_ID);
  if (layer) {
    return layer;
  }
  return document.body;
}

export function portalDrawerSurface(node: ReactNode): ReactNode {
  if (typeof document === "undefined") {
    return node;
  }
  return createPortal(node, getAppDrawerPortalRoot());
}

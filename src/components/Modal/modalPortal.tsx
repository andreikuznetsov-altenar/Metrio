import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export const APP_MODAL_LAYER_ID = "app-modal-layer";

/** App-shell modal layer (above drawer, same vertical bounds as drawer scrim). */
export function getAppModalPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("Modal portal requires document");
  }
  const layer = document.getElementById(APP_MODAL_LAYER_ID);
  if (layer) {
    return layer;
  }
  return document.body;
}

export function portalModalSurface(node: ReactNode): ReactNode {
  if (typeof document === "undefined") {
    return node;
  }
  return createPortal(node, getAppModalPortalRoot());
}

export const APP_TOOLTIP_LAYER_ID = "app-tooltip-layer";

/** Global tooltip layer (above drawer + modal, below toast). */
export function getAppTooltipPortalRoot(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("Tooltip portal requires document");
  }
  const layer = document.getElementById(APP_TOOLTIP_LAYER_ID);
  if (layer) {
    return layer;
  }
  return document.body;
}

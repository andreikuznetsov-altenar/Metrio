/** Keep in sync with tray_popover.rs (TRAY_POPOVER_GAP). */
export const TRAY_POPOVER_GAP_PX = 4;
/** @deprecated Use TRAY_POPOVER_GAP_PX. */
export const TRAY_ARROW_TIP_GAP_PX = TRAY_POPOVER_GAP_PX;

/** Transparent host inset so the soft CSS shadow is not clipped. */
export const TRAY_HOST_SHADOW_INSET_PX = 16;

export const TRAY_POPOVER_SHADOW_TOKEN = "var(--tray-popover-shadow)";

export type TrayAnchorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function trayBottomY(anchor: TrayAnchorRect): number {
  return anchor.top + anchor.height;
}

export function trayCenterX(anchor: TrayAnchorRect): number {
  return anchor.left + anchor.width / 2;
}

/** Screen Y of the visible popover surface. */
export function trayArrowTipYFromAnchor(anchor: TrayAnchorRect): number {
  return trayBottomY(anchor) + TRAY_POPOVER_GAP_PX;
}

/** Native host window origin Y; inset above the visible surface for shadow room. */
export function trayHostWindowYFromArrowTip(arrowTipY: number): number {
  return arrowTipY - TRAY_HOST_SHADOW_INSET_PX;
}

export function trayHostWindowPosition(
  anchor: TrayAnchorRect,
  hostWidth: number,
  monitorX: number,
  monitorWidth: number,
): { x: number; y: number; arrowTipY: number } {
  const centerX = trayCenterX(anchor);
  const arrowTipY = trayArrowTipYFromAnchor(anchor);
  const y = trayHostWindowYFromArrowTip(arrowTipY);
  const half = hostWidth / 2;
  const minX = monitorX + 8;
  const maxX = monitorX + monitorWidth - hostWidth - 8;
  const x = Math.min(Math.max(centerX - half, minX), Math.max(minX, maxX));
  return { x, y, arrowTipY };
}

export function visiblePopoverCenterX(hostX: number, hostWidth: number): number {
  return hostX + hostWidth / 2;
}

export function hostFitsPopoverContent(
  hostWidth: number,
  hostHeight: number,
  popoverWidth: number,
  popoverHeight: number,
): boolean {
  const pad = TRAY_HOST_SHADOW_INSET_PX * 2;
  return hostWidth >= popoverWidth + pad && hostHeight >= popoverHeight + pad;
}

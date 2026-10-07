/** Drop-shadow(0 12px 36px …) safe transparent host margins — keep in sync with tray-popover.css + tray_popover.rs */
export const TRAY_POPOVER_SHADOW_OFFSET_Y_PX = 12;
export const TRAY_POPOVER_SHADOW_BLUR_PX = 36;

export const TRAY_ARROW_TIP_GAP_PX = 4;

export const TRAY_HOST_SHADOW_TOP_PX =
  TRAY_POPOVER_SHADOW_BLUR_PX - TRAY_POPOVER_SHADOW_OFFSET_Y_PX;
export const TRAY_HOST_SHADOW_BOTTOM_PX =
  TRAY_POPOVER_SHADOW_OFFSET_Y_PX + TRAY_POPOVER_SHADOW_BLUR_PX;
export const TRAY_HOST_SHADOW_INLINE_PX = 28;

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

/** Screen Y of the visible arrow tip (top of `.tray-popover`). */
export function trayArrowTipYFromAnchor(anchor: TrayAnchorRect): number {
  return trayBottomY(anchor) + TRAY_ARROW_TIP_GAP_PX;
}

/** Native host window origin Y so arrow tip sits below tray with shadow room above. */
export function trayHostWindowYFromArrowTip(arrowTipY: number): number {
  return arrowTipY - TRAY_HOST_SHADOW_TOP_PX;
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

export function hostFitsPopoverWithShadow(
  hostWidth: number,
  hostHeight: number,
  popoverWidth: number,
  popoverHeight: number,
): boolean {
  return (
    hostWidth >= popoverWidth + TRAY_HOST_SHADOW_INLINE_PX * 2 &&
    hostHeight >= popoverHeight + TRAY_HOST_SHADOW_TOP_PX + TRAY_HOST_SHADOW_BOTTOM_PX
  );
}

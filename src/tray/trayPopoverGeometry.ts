/** Keep in sync with tray_popover.rs (TRAY_ARROW_TIP_GAP). */
export const TRAY_ARROW_TIP_GAP_PX = 4;

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

/** Native host window origin Y; arrow tip aligns with the top of the popover content. */
export function trayHostWindowYFromArrowTip(arrowTipY: number): number {
  return arrowTipY;
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
  return hostWidth >= popoverWidth && hostHeight >= popoverHeight;
}

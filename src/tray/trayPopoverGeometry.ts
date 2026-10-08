/** Keep in sync with tray_popover.rs (TRAY_POPOVER_GAP). */
export const TRAY_POPOVER_GAP_PX = 3;
/** @deprecated Use TRAY_POPOVER_GAP_PX. */
export const TRAY_ARROW_TIP_GAP_PX = TRAY_POPOVER_GAP_PX;

/** Horizontal/bottom bleed for CSS shadow — never above the visible surface. */
export const TRAY_HOST_SHADOW_BLEED_X_PX = 12;
export const TRAY_HOST_SHADOW_BLEED_BOTTOM_PX = 14;

export const TRAY_POPOVER_RADIUS_PX = 20;
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

/** Screen Y of the visible popover surface top edge. */
export function trayVisibleSurfaceTopY(anchor: TrayAnchorRect): number {
  return trayBottomY(anchor) + TRAY_POPOVER_GAP_PX;
}

/** Native host window origin Y — no top padding; surface aligns with host top. */
export function trayHostWindowYFromVisibleSurface(visibleSurfaceTopY: number): number {
  return visibleSurfaceTopY;
}

export function trayHostWindowPosition(
  anchor: TrayAnchorRect,
  hostWidth: number,
  monitorX: number,
  monitorWidth: number,
): { x: number; y: number; visibleSurfaceTopY: number } {
  const centerX = trayCenterX(anchor);
  const visibleSurfaceTopY = trayVisibleSurfaceTopY(anchor);
  const y = trayHostWindowYFromVisibleSurface(visibleSurfaceTopY);
  const half = hostWidth / 2;
  const minX = monitorX + 8;
  const maxX = monitorX + monitorWidth - hostWidth - 8;
  const x = Math.min(Math.max(centerX - half, minX), Math.max(minX, maxX));
  return { x, y, visibleSurfaceTopY };
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
  const horizontal = TRAY_HOST_SHADOW_BLEED_X_PX * 2;
  const vertical = TRAY_HOST_SHADOW_BLEED_BOTTOM_PX;
  return hostWidth >= popoverWidth + horizontal && hostHeight >= popoverHeight + vertical;
}

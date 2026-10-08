import { describe, expect, it } from "vitest";
import {
  TRAY_HOST_SHADOW_BLEED_BOTTOM_PX,
  TRAY_HOST_SHADOW_BLEED_TOP_PX,
  TRAY_HOST_SHADOW_BLEED_X_PX,
  TRAY_POPOVER_GAP_PX,
  TRAY_POPOVER_RADIUS_PX,
  TRAY_POPOVER_SHADOW_CSS,
  TRAY_POPOVER_SHADOW_TOKEN,
  hostFitsPopoverContent,
  trayHostWindowPosition,
  trayHostWindowYFromVisibleSurface,
  trayVisibleSurfaceTopY,
  visiblePopoverCenterX,
} from "./trayPopoverGeometry";

/** Status-item bottom equals menu-bar bottom on macOS menu-bar trays. */
const menuBarBottom = 37;
const anchor = { left: 900, top: menuBarBottom - 22, width: 22, height: 22 };

describe("trayPopoverGeometry", () => {
  it("places visible surface 0–2px below menu bar / tray icon bottom", () => {
    const visibleTop = trayVisibleSurfaceTopY(anchor);
    const gap = visibleTop - menuBarBottom;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(2);
    expect(gap).toBe(TRAY_POPOVER_GAP_PX);
    expect(TRAY_POPOVER_GAP_PX).toBe(1);
  });

  it("raises the host by top bleed so the visible surface does not move down", () => {
    const visibleTop = trayVisibleSurfaceTopY(anchor);
    const { y, visibleSurfaceTopY } = trayHostWindowPosition(anchor, 288, 0, 1920);
    expect(visibleSurfaceTopY).toBe(visibleTop);
    expect(y).toBe(visibleTop - TRAY_HOST_SHADOW_BLEED_TOP_PX);
    expect(y).toBeLessThan(menuBarBottom);
    expect(trayHostWindowYFromVisibleSurface(visibleTop) + TRAY_HOST_SHADOW_BLEED_TOP_PX).toBe(
      visibleTop,
    );
    expect(TRAY_POPOVER_RADIUS_PX).toBe(20);
    expect(TRAY_POPOVER_SHADOW_TOKEN).toBe("var(--tray-popover-shadow)");
    expect(TRAY_POPOVER_SHADOW_CSS).toBe("0 4px 12px rgba(0, 0, 0, 0.11)");
  });

  it("keeps popover centered on tray icon when host is positioned", () => {
    const hostWidth = 288;
    const { x } = trayHostWindowPosition(anchor, hostWidth, 0, 1920);
    const trayCenter = anchor.left + anchor.width / 2;
    expect(visiblePopoverCenterX(x, hostWidth)).toBeCloseTo(trayCenter, 5);
  });

  it("requires host bounds to include top, side, and bottom shadow bleed", () => {
    const popoverW = 256;
    const popoverH = 200;
    const hostW = popoverW + TRAY_HOST_SHADOW_BLEED_X_PX * 2;
    const hostH = popoverH + TRAY_HOST_SHADOW_BLEED_TOP_PX + TRAY_HOST_SHADOW_BLEED_BOTTOM_PX;
    expect(hostFitsPopoverContent(hostW, hostH, popoverW, popoverH)).toBe(true);
    expect(hostFitsPopoverContent(popoverW, popoverH, popoverW, popoverH)).toBe(false);
  });
});

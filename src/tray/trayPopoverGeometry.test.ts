import { describe, expect, it } from "vitest";
import {
  TRAY_HOST_SHADOW_BLEED_BOTTOM_PX,
  TRAY_HOST_SHADOW_BLEED_X_PX,
  TRAY_POPOVER_GAP_PX,
  TRAY_POPOVER_RADIUS_PX,
  TRAY_POPOVER_SHADOW_TOKEN,
  hostFitsPopoverContent,
  trayHostWindowPosition,
  trayVisibleSurfaceTopY,
  visiblePopoverCenterX,
} from "./trayPopoverGeometry";

const anchor = { left: 900, top: 4, width: 22, height: 22 };

describe("trayPopoverGeometry", () => {
  it("places visible surface ~3px below tray anchor bottom", () => {
    expect(trayVisibleSurfaceTopY(anchor)).toBe(
      anchor.top + anchor.height + TRAY_POPOVER_GAP_PX,
    );
    expect(TRAY_POPOVER_GAP_PX).toBe(3);
  });

  it("aligns host window top with visible surface (no top shadow bleed)", () => {
    const visibleTop = trayVisibleSurfaceTopY(anchor);
    const { y, visibleSurfaceTopY } = trayHostWindowPosition(anchor, 288, 0, 1920);
    expect(visibleSurfaceTopY).toBe(visibleTop);
    expect(y).toBe(visibleTop);
    expect(TRAY_POPOVER_RADIUS_PX).toBe(20);
    expect(TRAY_POPOVER_SHADOW_TOKEN).toBe("var(--tray-popover-shadow)");
  });

  it("keeps popover centered on tray icon when host is positioned", () => {
    const hostWidth = 288;
    const { x } = trayHostWindowPosition(anchor, hostWidth, 0, 1920);
    const trayCenter = anchor.left + anchor.width / 2;
    expect(visiblePopoverCenterX(x, hostWidth)).toBeCloseTo(trayCenter, 5);
  });

  it("requires host bounds to include side/bottom shadow bleed only", () => {
    const popoverW = 256;
    const popoverH = 200;
    const hostW = popoverW + TRAY_HOST_SHADOW_BLEED_X_PX * 2;
    const hostH = popoverH + TRAY_HOST_SHADOW_BLEED_BOTTOM_PX;
    expect(hostFitsPopoverContent(hostW, hostH, popoverW, popoverH)).toBe(true);
    expect(hostFitsPopoverContent(popoverW, popoverH, popoverW, popoverH)).toBe(false);
  });
});

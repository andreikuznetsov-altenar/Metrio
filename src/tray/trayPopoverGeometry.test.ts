import { describe, expect, it } from "vitest";
import {
  TRAY_ARROW_TIP_GAP_PX,
  TRAY_HOST_SHADOW_BOTTOM_PX,
  TRAY_HOST_SHADOW_INLINE_PX,
  TRAY_HOST_SHADOW_TOP_PX,
  hostFitsPopoverWithShadow,
  trayArrowTipYFromAnchor,
  trayHostWindowPosition,
  trayHostWindowYFromArrowTip,
  visiblePopoverCenterX,
} from "./trayPopoverGeometry";

const anchor = { left: 900, top: 4, width: 22, height: 22 };

describe("trayPopoverGeometry", () => {
  it("places arrow tip 4px below tray anchor bottom", () => {
    expect(trayArrowTipYFromAnchor(anchor)).toBe(anchor.top + anchor.height + TRAY_ARROW_TIP_GAP_PX);
  });

  it("offsets host window up by top shadow allowance only", () => {
    const arrowTipY = trayArrowTipYFromAnchor(anchor);
    const hostY = trayHostWindowYFromArrowTip(arrowTipY);
    expect(arrowTipY - hostY).toBe(TRAY_HOST_SHADOW_TOP_PX);
  });

  it("keeps popover centered on tray icon when host is positioned", () => {
    const hostWidth = 256 + TRAY_HOST_SHADOW_INLINE_PX * 2;
    const { x, arrowTipY } = trayHostWindowPosition(anchor, hostWidth, 0, 1920);
    const trayCenter = anchor.left + anchor.width / 2;
    expect(visiblePopoverCenterX(x, hostWidth)).toBeCloseTo(trayCenter, 5);
    expect(arrowTipY).toBe(30);
  });

  it("requires host bounds to contain popover plus shadow margins", () => {
    const popoverW = 256;
    const popoverH = 200;
    expect(
      hostFitsPopoverWithShadow(
        popoverW + TRAY_HOST_SHADOW_INLINE_PX * 2,
        popoverH + TRAY_HOST_SHADOW_TOP_PX + TRAY_HOST_SHADOW_BOTTOM_PX,
        popoverW,
        popoverH,
      ),
    ).toBe(true);
    expect(hostFitsPopoverWithShadow(popoverW, popoverH, popoverW, popoverH)).toBe(false);
  });
});

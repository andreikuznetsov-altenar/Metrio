import { describe, expect, it } from "vitest";
import {
  TRAY_ARROW_TIP_GAP_PX,
  TRAY_HOST_SHADOW_INSET_PX,
  TRAY_POPOVER_SHADOW_TOKEN,
  hostFitsPopoverContent,
  trayArrowTipYFromAnchor,
  trayHostWindowPosition,
  trayHostWindowYFromArrowTip,
  visiblePopoverCenterX,
} from "./trayPopoverGeometry";

const anchor = { left: 900, top: 4, width: 22, height: 22 };

describe("trayPopoverGeometry", () => {
  it("places visible surface 4px below tray anchor bottom", () => {
    expect(trayArrowTipYFromAnchor(anchor)).toBe(anchor.top + anchor.height + TRAY_ARROW_TIP_GAP_PX);
  });

  it("insets the host window so the CSS shadow has room without moving the surface", () => {
    const arrowTipY = trayArrowTipYFromAnchor(anchor);
    expect(trayHostWindowYFromArrowTip(arrowTipY)).toBe(
      arrowTipY - TRAY_HOST_SHADOW_INSET_PX,
    );
    expect(TRAY_HOST_SHADOW_INSET_PX).toBe(16);
    expect(TRAY_POPOVER_SHADOW_TOKEN).toBe("var(--tray-popover-shadow)");
  });

  it("keeps popover centered on tray icon when host is positioned", () => {
    const hostWidth = 288;
    const { x, y, arrowTipY } = trayHostWindowPosition(anchor, hostWidth, 0, 1920);
    const trayCenter = anchor.left + anchor.width / 2;
    expect(visiblePopoverCenterX(x, hostWidth)).toBeCloseTo(trayCenter, 5);
    expect(arrowTipY).toBe(30);
    expect(y).toBe(arrowTipY - TRAY_HOST_SHADOW_INSET_PX);
  });

  it("requires host bounds to include the shadow inset around the visible popover", () => {
    const popoverW = 256;
    const popoverH = 200;
    const pad = TRAY_HOST_SHADOW_INSET_PX * 2;
    expect(hostFitsPopoverContent(popoverW + pad, popoverH + pad, popoverW, popoverH)).toBe(
      true,
    );
    expect(hostFitsPopoverContent(popoverW, popoverH, popoverW, popoverH)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  TRAY_ARROW_TIP_GAP_PX,
  hostFitsPopoverContent,
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

  it("aligns host window top with arrow tip (no shadow safe area)", () => {
    const arrowTipY = trayArrowTipYFromAnchor(anchor);
    expect(trayHostWindowYFromArrowTip(arrowTipY)).toBe(arrowTipY);
  });

  it("keeps popover centered on tray icon when host is positioned", () => {
    const hostWidth = 256;
    const { x, y, arrowTipY } = trayHostWindowPosition(anchor, hostWidth, 0, 1920);
    const trayCenter = anchor.left + anchor.width / 2;
    expect(visiblePopoverCenterX(x, hostWidth)).toBeCloseTo(trayCenter, 5);
    expect(arrowTipY).toBe(30);
    expect(y).toBe(arrowTipY);
  });

  it("requires host bounds to match visible popover size only", () => {
    const popoverW = 256;
    const popoverH = 200;
    expect(hostFitsPopoverContent(popoverW, popoverH, popoverW, popoverH)).toBe(true);
    expect(hostFitsPopoverContent(popoverW - 1, popoverH, popoverW, popoverH)).toBe(false);
  });
});

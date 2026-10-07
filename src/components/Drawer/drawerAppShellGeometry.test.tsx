// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import "../../styles/app-surfaces.css";
import "../AppShell/AppShell.css";
import { ensureAppShellWithOverlayLayers } from "./drawerTestUtils";

describe("Drawer app-shell geometry", () => {
  afterEach(() => {
    document.querySelectorAll(".app-shell, [data-testid='native-titlebar']").forEach((n) =>
      n.remove(),
    );
  });

  it("drawer scrim top aligns with Metrio header, not native titlebar", () => {
    const { shell, header, nativeTitlebar } = ensureAppShellWithOverlayLayers();
    const drawerLayer = shell.querySelector(".app-drawer-layer")!;
    const headerRect = header.getBoundingClientRect();
    const layerRect = drawerLayer.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const titlebarRect = nativeTitlebar.getBoundingClientRect();

    expect(layerRect.top).toBeCloseTo(headerRect.top, 0);
    expect(layerRect.top).toBeCloseTo(shellRect.top, 0);
    expect(titlebarRect.bottom).toBeLessThanOrEqual(shellRect.top + 1);
    expect(
      layerRect.top < titlebarRect.bottom ||
        titlebarRect.bottom <= shellRect.top,
    ).toBe(true);
  });
});

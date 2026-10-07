// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";
import {
  ensureAppDrawerLayer,
  flushDrawerAnimations,
  installDrawerMotionMock,
  readDrawerPanelTranslateX,
} from "./drawerTestUtils";

describe("Drawer transform motion (WAAPI)", () => {
  beforeEach(() => {
    installDrawerMotionMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById("app-drawer-layer")?.remove();
  });

  it("starts off-screen then settles at open position after motion finishes", async () => {
    ensureAppDrawerLayer();
    const animate = HTMLElement.prototype.animate as ReturnType<typeof installDrawerMotionMock>;
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    expect(readDrawerPanelTranslateX(panel)).toBeGreaterThanOrEqual(100);

    await flushDrawerAnimations();
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);
    expect(animate).toHaveBeenCalled();
    const panelCalls = animate.mock.calls.filter((call) => call[0]?.[0]?.transform);
    expect(String(panelCalls[0]?.[0]?.[0]?.transform)).toContain("100%");
  });

  it("animates off-screen while closing before unmount", async () => {
    ensureAppDrawerLayer();
    const { rerender } = render(
      <Drawer open onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    await flushDrawerAnimations();
    const panel = screen.getByRole("dialog");
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);

    rerender(
      <Drawer open={false} onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);

    await flushDrawerAnimations();
    expect(readDrawerPanelTranslateX(panel)).toBeGreaterThanOrEqual(100);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

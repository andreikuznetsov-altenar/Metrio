// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";
import {
  dispatchDrawerPanelTransitionEnd,
  ensureAppDrawerLayer,
  flushDrawerCloseFrames,
  flushDrawerOpenFrames,
  readDrawerPanelTranslateX,
} from "./drawerTestUtils";

describe("Drawer transform motion (computed style)", () => {
  afterEach(() => {
    document.getElementById("app-drawer-layer")?.remove();
  });

  it("progresses transform while opening across animation frames", async () => {
    ensureAppDrawerLayer();
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    const t0 = readDrawerPanelTranslateX(panel);

    await flushDrawerOpenFrames();
    const tOpen = readDrawerPanelTranslateX(panel);
    expect(t0).toBeGreaterThanOrEqual(100);
    expect(tOpen).toBeLessThan(1);
    expect(t0).toBeGreaterThan(tOpen);
  });

  it("progresses transform while closing before unmount", async () => {
    ensureAppDrawerLayer();
    const { rerender } = render(
      <Drawer open onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    await flushDrawerOpenFrames();
    const panel = screen.getByRole("dialog");
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);

    rerender(
      <Drawer open={false} onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await flushDrawerCloseFrames();
    expect(readDrawerPanelTranslateX(panel)).toBeGreaterThanOrEqual(100);

    act(() => {
      dispatchDrawerPanelTransitionEnd(panel);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

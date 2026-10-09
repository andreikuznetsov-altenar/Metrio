// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";
import {
  ensureAppDrawerLayer,
  flushDrawerAnimations,
  flushDrawerOpenFrames,
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
    expect(document.querySelector("[data-drawer-phase='mounted-enter']")).toBeTruthy();

    await flushDrawerOpenFrames();
    expect(animate).toHaveBeenCalled();
    const panelCalls = animate.mock.calls.filter((call) => call[0]?.[0]?.transform);
    expect(String(panelCalls[0]?.[0]?.[0]?.transform)).toContain("100%");
    expect(panelCalls[0]?.[0]?.[0]?.opacity).toBeUndefined();
    expect(panelCalls[0]?.[0]?.[1]?.opacity).toBeUndefined();
    expect(panelCalls[0]?.[1]?.duration).toBe(400);
    expect(panelCalls[0]?.[1]?.easing).toBe("cubic-bezier(0.22, 1, 0.36, 1)");

    await flushDrawerAnimations();
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);
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
        Keep me
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Keep me")).toBeInTheDocument();
    expect(readDrawerPanelTranslateX(panel)).toBeLessThan(1);

    await flushDrawerAnimations();
    expect(readDrawerPanelTranslateX(panel)).toBeGreaterThanOrEqual(100);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not restart enter motion when onClosed identity changes", async () => {
    ensureAppDrawerLayer();
    const animate = HTMLElement.prototype.animate as ReturnType<typeof installDrawerMotionMock>;
    const { rerender } = render(
      <Drawer open onClose={vi.fn()} onClosed={() => undefined} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    await flushDrawerOpenFrames();
    const calls = animate.mock.calls.length;
    rerender(
      <Drawer open onClose={vi.fn()} onClosed={() => undefined} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    expect(animate.mock.calls.length).toBe(calls);
  });

  it("keeps a reopened drawer mounted after a stale exit finishes", async () => {
    ensureAppDrawerLayer();
    const { rerender } = render(
      <Drawer open onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    await flushDrawerOpenFrames();
    await flushDrawerAnimations();
    rerender(
      <Drawer open={false} onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
    rerender(
      <Drawer open onClose={vi.fn()} ariaLabel="Motion drawer">
        Body
      </Drawer>,
    );
    await flushDrawerOpenFrames();
    await flushDrawerAnimations();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(readDrawerPanelTranslateX(screen.getByRole("dialog"))).toBeLessThan(1);
  });
});

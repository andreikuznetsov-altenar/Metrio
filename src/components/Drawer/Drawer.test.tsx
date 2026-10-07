import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";
import {
  dispatchDrawerPanelTransitionEnd,
  ensureAppDrawerLayer,
  flushDrawerCloseFrames,
  flushDrawerOpenFrames,
} from "./drawerTestUtils";

function completeDrawerCloseMotion() {
  const panel = screen.getByRole("dialog");
  act(() => {
    dispatchDrawerPanelTransitionEnd(panel);
  });
}

describe("Drawer", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    document.getElementById("app-drawer-layer")?.remove();
  });

  it("portals drawer root to app-drawer-layer outside page containers", async () => {
    const host = document.createElement("div");
    host.className = "app-shell app-shell--page-toolbar";
    host.style.setProperty("--app-side-surface-top", "120px");
    document.body.appendChild(host);
    const layer = ensureAppDrawerLayer();
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Test drawer">
        Body
      </Drawer>,
      { container: host },
    );
    const root = layer.querySelector(".drawer-root");
    expect(root).toBeTruthy();
    expect(root?.parentElement).toBe(layer);
    expect(host.querySelector(".drawer-root")).toBeNull();
    host.remove();
  });

  it("enters through opening phase before is-open applies", async () => {
    ensureAppDrawerLayer();
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    const root = ensureAppDrawerLayer().querySelector(".drawer-root");
    expect(root).toHaveAttribute("data-drawer-phase", "opening");
    expect(root).not.toHaveClass("is-open");
    await flushDrawerOpenFrames();
    expect(root).toHaveAttribute("data-drawer-phase", "open");
    expect(root).toHaveClass("is-open");
  });

  it("syncs scrim backdrop with open state for content-area dimming", async () => {
    ensureAppDrawerLayer();
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    await flushDrawerOpenFrames();
    const root = ensureAppDrawerLayer().querySelector(".drawer-root");
    const backdrop = ensureAppDrawerLayer().querySelector(".drawer-root__backdrop");
    expect(backdrop).toBeTruthy();
    expect(root).toHaveClass("is-open");
    expect(backdrop).toHaveClass("drawer-root__backdrop");
  });

  it("applies size variant class for analytics width token", () => {
    ensureAppDrawerLayer();
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Sized drawer" size="analytics">
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("drawer--analytics");
  });

  it("exposes closing phase before unmount and completes on transform transitionend", async () => {
    ensureAppDrawerLayer();
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open onClose={onClose} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    await flushDrawerOpenFrames();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const root = ensureAppDrawerLayer().querySelector(".drawer-root");
    expect(root).toHaveAttribute("data-drawer-phase", "open");

    rerender(
      <Drawer open={false} onClose={onClose} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(root).toHaveAttribute("data-drawer-phase", "open");
    expect(root).toHaveClass("is-open");

    await flushDrawerCloseFrames();
    expect(root).toHaveAttribute("data-drawer-phase", "closing");
    expect(root).not.toHaveClass("is-open");

    act(() => {
      completeDrawerCloseMotion();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

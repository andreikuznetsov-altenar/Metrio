import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";
import {
  ensureAppDrawerLayer,
  flushDrawerAnimations,
  installDrawerMotionMock,
} from "./drawerTestUtils";

describe("Drawer", () => {
  beforeEach(() => {
    installDrawerMotionMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("enters through entering phase before open", async () => {
    ensureAppDrawerLayer();
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    const root = ensureAppDrawerLayer().querySelector(".drawer-root");
    expect(root).toHaveAttribute("data-drawer-phase", "entering");
    await flushDrawerAnimations();
    expect(root).toHaveAttribute("data-drawer-phase", "open");
  });

  it("syncs scrim backdrop element with drawer surface", async () => {
    ensureAppDrawerLayer();
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    await flushDrawerAnimations();
    const backdrop = ensureAppDrawerLayer().querySelector(".drawer-root__backdrop");
    expect(backdrop).toBeTruthy();
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

  it("exposes exiting phase before unmount and completes on WAAPI finish", async () => {
    ensureAppDrawerLayer();
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open onClose={onClose} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    await flushDrawerAnimations();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const root = ensureAppDrawerLayer().querySelector(".drawer-root");
    expect(root).toHaveAttribute("data-drawer-phase", "open");

    rerender(
      <Drawer open={false} onClose={onClose} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(root).toHaveAttribute("data-drawer-phase", "exiting");
    await flushDrawerAnimations();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

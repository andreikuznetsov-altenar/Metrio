// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../styles/app-surfaces.css";
import "../AppShell/AppShell.css";
import { Modal } from "../Modal/Modal";
import { Drawer } from "./Drawer";
import {
  ensureAppShellWithOverlayLayers,
  flushDrawerAnimations,
  installDrawerMotionMock,
} from "./drawerTestUtils";

describe("Drawer + modal stacking", () => {
  beforeEach(() => {
    installDrawerMotionMock();
    ensureAppShellWithOverlayLayers();
    document.documentElement.style.setProperty("--z-drawer-scrim", "110");
    document.documentElement.style.setProperty("--z-drawer-panel", "111");
    document.documentElement.style.setProperty("--z-modal-scrim", "120");
    document.documentElement.style.setProperty("--z-modal-panel", "121");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelector(".app-shell")?.remove();
    document.querySelector("[data-testid='native-titlebar']")?.remove();
    document.querySelectorAll(".metrio-modal-root").forEach((node) => node.remove());
  });

  it("renders modal portal outside drawer root with higher z-index tokens", async () => {
    render(
      <>
        <Drawer open onClose={vi.fn()} ariaLabel="Person drawer">
          Drawer body
        </Drawer>
        <Modal open onClose={vi.fn()} title="Task list">
          Modal body
        </Modal>
      </>,
    );
    await flushDrawerAnimations();
    await waitFor(() => {
      expect(document.querySelector(".metrio-modal-root--open")).toBeTruthy();
    });

    const drawerRoot = document.querySelector(".drawer-root");
    const modalRoot = document.querySelector(".metrio-modal-root--open");
    expect(drawerRoot).toBeTruthy();
    expect(modalRoot).toBeTruthy();
    expect(drawerRoot?.contains(modalRoot ?? null)).toBe(false);

    const layer = document.getElementById("app-drawer-layer");
    const modalLayer = document.getElementById("app-modal-layer");
    expect(modalLayer?.contains(modalRoot ?? null)).toBe(true);
    expect(drawerRoot?.contains(modalRoot ?? null)).toBe(false);

    const modalScrimToken = getComputedStyle(document.documentElement)
      .getPropertyValue("--z-modal-scrim")
      .trim();
    const drawerScrimToken = getComputedStyle(document.documentElement)
      .getPropertyValue("--z-drawer-scrim")
      .trim();
    expect(Number(modalScrimToken)).toBeGreaterThan(Number(drawerScrimToken));
    const shell = modalLayer?.parentElement;
    expect(shell?.classList.contains("app-shell")).toBe(true);
    expect(shell?.querySelector("#app-drawer-layer")?.contains(drawerRoot ?? null)).toBe(true);
    expect(modalRoot?.className).toContain("metrio-modal-root");

    expect(screen.getByText("Modal body")).toBeVisible();
    expect(screen.getByText("Drawer body")).toBeInTheDocument();
  });
});

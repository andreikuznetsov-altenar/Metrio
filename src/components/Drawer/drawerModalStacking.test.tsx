// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../styles/app-surfaces.css";
import { Modal } from "../Modal/Modal";
import { Drawer } from "./Drawer";
import {
  ensureAppDrawerLayer,
  flushDrawerAnimations,
  installDrawerMotionMock,
} from "./drawerTestUtils";

describe("Drawer + modal stacking", () => {
  beforeEach(() => {
    installDrawerMotionMock();
    const layer = ensureAppDrawerLayer();
    layer.style.zIndex = "110";
    document.documentElement.style.setProperty("--z-modal-scrim", "120");
    document.documentElement.style.setProperty("--z-modal-panel", "121");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById("app-drawer-layer")?.remove();
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
    expect(layer?.contains(modalRoot ?? null)).toBe(false);
    expect(modalRoot?.parentElement).toBe(document.body);

    const drawerLayerZ = Number(
      getComputedStyle(document.querySelector(".app-drawer-layer")!).zIndex,
    );
    const modalScrimToken = getComputedStyle(document.documentElement)
      .getPropertyValue("--z-modal-scrim")
      .trim();
    const drawerScrimToken = getComputedStyle(document.documentElement)
      .getPropertyValue("--z-drawer-scrim")
      .trim();
    expect(drawerLayerZ).toBeGreaterThanOrEqual(Number(drawerScrimToken));
    expect(Number(modalScrimToken)).toBeGreaterThan(Number(drawerScrimToken));
    expect(modalRoot?.className).toContain("metrio-modal-root");

    expect(screen.getByText("Modal body")).toBeVisible();
    expect(screen.getByText("Drawer body")).toBeInTheDocument();
  });
});

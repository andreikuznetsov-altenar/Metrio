// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { AppShell } from "../AppShell/AppShell";
import { HelpIcon } from "../HelpIcon/HelpIcon";
import { Tooltip, TooltipProvider } from "./Tooltip";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

afterEach(() => cleanup());

describe("global tooltip layer", () => {
  it("portals tooltip content into app-tooltip-layer above drawer and modal layers", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <AppShell header={<div>Header</div>}>
          <div data-testid="page-surface">
            <Tooltip content="Page tip">
              <button type="button">Page info</button>
            </Tooltip>
          </div>
          <div data-testid="drawer-surface">
            <HelpIcon label="Drawer tip" />
          </div>
          <div data-testid="modal-surface">
            <Tooltip content="Modal tip">
              <button type="button">Modal info</button>
            </Tooltip>
          </div>
        </AppShell>
      </TooltipProvider>,
    );

    const layer = screen.getByTestId("app-tooltip-layer");
    const drawer = screen.getByTestId("app-drawer-layer");
    const modal = screen.getByTestId("app-modal-layer");
    expect(layer.compareDocumentPosition(modal) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(modal.compareDocumentPosition(drawer) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(layer.className).toContain("app-tooltip-layer");

    await user.hover(screen.getByRole("button", { name: "Page info" }));
    const pageTip = await waitFor(() => screen.getByTestId("metrio-tooltip"));
    expect(layer.contains(pageTip)).toBe(true);
    expect(pageTip.textContent).toContain("Page tip");

    await user.unhover(screen.getByRole("button", { name: "Page info" }));
    await user.hover(screen.getByRole("button", { name: "Drawer tip" }));
    const drawerTip = await waitFor(() => screen.getByTestId("metrio-tooltip"));
    expect(layer.contains(drawerTip)).toBe(true);

    await user.unhover(screen.getByRole("button", { name: "Drawer tip" }));
    await user.hover(screen.getByRole("button", { name: "Modal info" }));
    const modalTip = await waitFor(() => screen.getByTestId("metrio-tooltip"));
    expect(layer.contains(modalTip)).toBe(true);
  });
});

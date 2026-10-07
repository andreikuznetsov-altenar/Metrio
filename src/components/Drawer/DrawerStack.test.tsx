import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DrawerStack } from "./DrawerStack";
import {
  dispatchDrawerPanelTransitionEnd,
  flushDrawerOpenFrames,
} from "./drawerTestUtils";

function completeDrawerCloseMotion() {
  const panel = screen.getByRole("dialog");
  act(() => {
    dispatchDrawerPanelTransitionEnd(panel);
  });
}

describe("DrawerStack", () => {
  afterEach(() => cleanup());

  it("keeps a single backdrop while switching primary to secondary and back", async () => {
    const onClose = vi.fn();
    const onBack = vi.fn();
    const { rerender } = render(
      <DrawerStack
        open
        activePanel="primary"
        onClose={onClose}
        onBack={onBack}
        ariaLabel="Person"
        testId="drawer-stack-test"
        header={<span>Person</span>}
      >
        <p>Person body</p>
      </DrawerStack>,
    );

    await flushDrawerOpenFrames();
    expect(document.querySelectorAll(".drawer-root__backdrop")).toHaveLength(1);
    expect(screen.getByTestId("drawer-stack-test")).toHaveAttribute(
      "data-drawer-panel",
      "primary",
    );

    rerender(
      <DrawerStack
        open
        activePanel="secondary"
        onClose={onClose}
        onBack={onBack}
        ariaLabel="Brief"
        testId="drawer-stack-test"
        header={<span>Brief</span>}
      >
        <p>Brief body</p>
      </DrawerStack>,
    );

    expect(document.querySelectorAll(".drawer-root__backdrop")).toHaveLength(1);
    expect(screen.getByTestId("drawer-stack-test")).toHaveAttribute(
      "data-drawer-panel",
      "secondary",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(
      <DrawerStack
        open
        activePanel="primary"
        onClose={onClose}
        onBack={onBack}
        ariaLabel="Person"
        testId="drawer-stack-test"
        header={<span>Person</span>}
      >
        <p>Person body</p>
      </DrawerStack>,
    );

    expect(document.querySelectorAll(".drawer-root__backdrop")).toHaveLength(1);

    rerender(
      <DrawerStack
        open={false}
        activePanel="primary"
        onClose={onClose}
        onBack={onBack}
        ariaLabel="Person"
        testId="drawer-stack-test"
        header={<span>Person</span>}
      >
        <p>Person body</p>
      </DrawerStack>,
    );

    act(() => {
      completeDrawerCloseMotion();
    });

    expect(screen.queryByTestId("drawer-stack-test")).toBeNull();
    expect(document.querySelectorAll(".drawer-root__backdrop")).toHaveLength(0);
  });

  it("keeps dialog mounted until exit motion completes", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <DrawerStack
        open
        activePanel="primary"
        onClose={onClose}
        ariaLabel="Person"
        header={<span>Person</span>}
      >
        Primary
      </DrawerStack>,
    );
    await flushDrawerOpenFrames();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(
      <DrawerStack
        open={false}
        activePanel="primary"
        onClose={onClose}
        ariaLabel="Person"
        header={<span>Person</span>}
      >
        Primary
      </DrawerStack>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    completeDrawerCloseMotion();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

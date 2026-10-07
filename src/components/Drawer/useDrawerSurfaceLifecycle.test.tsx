// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDrawerSurfaceLifecycle } from "./useDrawerSurfaceLifecycle";

async function flushDoubleRaf() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

describe("useDrawerSurfaceLifecycle", () => {
  it("starts in opening phase with visible false before enter transition", async () => {
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open),
      { initialProps: { open: true } },
    );
    expect(result.current.mounted).toBe(true);
    expect(result.current.visible).toBe(false);
    expect(result.current.phase).toBe("opening");
    await flushDoubleRaf();
    expect(result.current.visible).toBe(true);
    expect(result.current.phase).toBe("open");
  });

  it("keeps mounted through closing until transition completes", () => {
    const onClosed = vi.fn();
    const panel = document.createElement("aside");
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open, onClosed),
      { initialProps: { open: true } },
    );
    result.current.panelRef.current = panel;
    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("closing");
    act(() => {
      const event = new Event("transitionend", { bubbles: true }) as TransitionEvent;
      Object.defineProperty(event, "propertyName", { value: "transform" });
      Object.defineProperty(event, "target", { value: panel });
      panel.dispatchEvent(event);
    });
    expect(result.current.mounted).toBe(false);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});

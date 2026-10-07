// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDrawerSurfaceLifecycle } from "./useDrawerSurfaceLifecycle";
import {
  flushDrawerAnimations,
  installDrawerMotionMock,
} from "./drawerTestUtils";

describe("useDrawerSurfaceLifecycle", () => {
  beforeEach(() => {
    installDrawerMotionMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enters through entering phase until WAAPI motion completes", async () => {
    const panel = document.createElement("aside");
    const backdrop = document.createElement("button");
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open),
      { initialProps: { open: false } },
    );
    act(() => {
      result.current.panelRef.current = panel;
      result.current.backdropRef.current = backdrop;
    });
    rerender({ open: true });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("entering");
    await flushDrawerAnimations();
    expect(result.current.phase).toBe("open");
  });

  it("keeps mounted through exiting until WAAPI motion completes", async () => {
    const onClosed = vi.fn();
    const panel = document.createElement("aside");
    const backdrop = document.createElement("button");
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open, onClosed),
      { initialProps: { open: false } },
    );
    act(() => {
      result.current.panelRef.current = panel;
      result.current.backdropRef.current = backdrop;
    });
    rerender({ open: true });
    await flushDrawerAnimations();
    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("exiting");
    await flushDrawerAnimations();
    expect(result.current.mounted).toBe(false);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});

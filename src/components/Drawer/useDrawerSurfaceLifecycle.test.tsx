// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDrawerSurfaceLifecycle } from "./useDrawerSurfaceLifecycle";
import {
  flushDrawerAnimations,
  flushDrawerOpenFrames,
  installDrawerMotionMock,
} from "./drawerTestUtils";

describe("useDrawerSurfaceLifecycle", () => {
  beforeEach(() => {
    installDrawerMotionMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function attachRefs(
    result: { current: ReturnType<typeof useDrawerSurfaceLifecycle> },
  ) {
    const panel = document.createElement("aside");
    const backdrop = document.createElement("button");
    act(() => {
      result.current.panelRef.current = panel;
      result.current.backdropRef.current = backdrop;
    });
    return { panel, backdrop };
  }

  it("A. closed → open: initial mounted phase is offscreen (mounted-enter)", async () => {
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open),
      { initialProps: { open: false } },
    );
    attachRefs(result);
    rerender({ open: true });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("mounted-enter");
    expect(result.current.panelRef.current?.style.transform).toContain("100%");
  });

  it("B. open target is not applied in the same commit as mount", async () => {
    const animate = HTMLElement.prototype.animate as ReturnType<
      typeof installDrawerMotionMock
    >;
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open),
      { initialProps: { open: false } },
    );
    attachRefs(result);
    rerender({ open: true });
    expect(result.current.phase).toBe("mounted-enter");
    expect(animate).not.toHaveBeenCalled();
    await flushDrawerOpenFrames();
    expect(result.current.phase).toBe("entering");
    expect(animate).toHaveBeenCalled();
    const from = String(animate.mock.calls[0]?.[0]?.[0]?.transform ?? "");
    expect(from).toContain("100%");
  });

  it("C/D. cached and uncached opens share the same enter lifecycle", async () => {
    const animate = HTMLElement.prototype.animate as ReturnType<
      typeof installDrawerMotionMock
    >;
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open),
      { initialProps: { open: false } },
    );
    attachRefs(result);

    // "uncached" first open
    rerender({ open: true });
    expect(result.current.phase).toBe("mounted-enter");
    await flushDrawerOpenFrames();
    expect(result.current.phase).toBe("entering");
    await flushDrawerAnimations();
    expect(result.current.phase).toBe("open");
    const firstCalls = animate.mock.calls.length;

    rerender({ open: false });
    await flushDrawerAnimations();
    expect(result.current.mounted).toBe(false);

    // "cached" reopen — same lifecycle
    rerender({ open: true });
    expect(result.current.phase).toBe("mounted-enter");
    await flushDrawerOpenFrames();
    expect(result.current.phase).toBe("entering");
    expect(animate.mock.calls.length).toBeGreaterThan(firstCalls);
    await flushDrawerAnimations();
    expect(result.current.phase).toBe("open");
  });

  it("enters through entering phase until WAAPI motion completes", async () => {
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open),
      { initialProps: { open: false } },
    );
    attachRefs(result);
    rerender({ open: true });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("mounted-enter");
    await flushDrawerOpenFrames();
    expect(result.current.phase).toBe("entering");
    await flushDrawerAnimations();
    expect(result.current.phase).toBe("open");
  });

  it("H. keeps mounted through exiting until WAAPI motion completes", async () => {
    const onClosed = vi.fn();
    const { result, rerender } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open, onClosed),
      { initialProps: { open: false } },
    );
    attachRefs(result);
    rerender({ open: true });
    await flushDrawerOpenFrames();
    await flushDrawerAnimations();
    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.phase).toBe("exiting");
    await flushDrawerAnimations();
    expect(result.current.mounted).toBe(false);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("G. pending RAF cancelled on unmount / close before enter starts", async () => {
    const animate = HTMLElement.prototype.animate as ReturnType<
      typeof installDrawerMotionMock
    >;
    const { result, rerender, unmount } = renderHook(
      ({ open }) => useDrawerSurfaceLifecycle(open),
      { initialProps: { open: false } },
    );
    attachRefs(result);
    rerender({ open: true });
    expect(result.current.phase).toBe("mounted-enter");
    unmount();
    await flushDrawerOpenFrames();
    expect(animate).not.toHaveBeenCalled();
  });
});

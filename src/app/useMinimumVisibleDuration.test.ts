import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMinimumVisibleDuration } from "./useMinimumVisibleDuration";

describe("useMinimumVisibleDuration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays visible for minimum duration after active ends", () => {
    const { result, rerender } = renderHook(
      ({ active }) => useMinimumVisibleDuration(active, 350),
      { initialProps: { active: false } },
    );

    rerender({ active: true });
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(349);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });
});

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";

describe("Drawer", () => {
  it("stays mounted during close exit animation", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open onClose={onClose} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(
      <Drawer open={false} onClose={onClose} ariaLabel="Test drawer">
        Body
      </Drawer>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(239);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

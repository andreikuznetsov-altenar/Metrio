import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastContext";

function ToastProbe() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success("Settings saved")}>
      Show toast
    </button>
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows success toast and auto dismisses", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    expect(screen.getByText("Settings saved")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(screen.queryByText("Settings saved")).not.toBeInTheDocument();
  });

  it("dismisses toast when close is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Show toast" }));
    expect(screen.getByText("Settings saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /dismiss notification/i }));
    expect(screen.queryByText("Settings saved")).not.toBeInTheDocument();
  });
});

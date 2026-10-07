import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";
import { TabularModal } from "./TabularModal";

describe("Modal", () => {
  afterEach(() => {
    cleanup();
  });

  it("stays mounted during close exit animation", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose} title="Tasks">
        Body
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(
      <Modal open={false} onClose={onClose} title="Tasks">
        Body
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(179);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders through app-modal-layer outside drawer host", () => {
    const modalLayer = document.createElement("div");
    modalLayer.id = "app-modal-layer";
    modalLayer.className = "app-modal-layer";
    document.body.appendChild(modalLayer);
    const host = document.createElement("div");
    host.setAttribute("data-testid", "drawer-host");
    document.body.appendChild(host);
    render(
      <Modal open onClose={vi.fn()} title="Tasks">
        Body
      </Modal>,
      { container: host },
    );
    const root = screen.getByTestId("metrio-modal-root");
    expect(root.parentElement).toBe(modalLayer);
    expect(host.querySelector(".metrio-modal-root")).toBeNull();
    host.remove();
    modalLayer.remove();
  });

  it("uses tabular modal width class for task-list shells", () => {
    render(
      <TabularModal open onClose={vi.fn()} title="Tasks" testId="task-list-modal">
        Table
      </TabularModal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("metrio-modal--tabular");
    expect(dialog.className).toContain("metrio-modal--task-list");
    expect(dialog.closest('[data-testid="metrio-modal-root"]')).toBeTruthy();
  });

  it("stops Escape from bubbling so parent drawers can stay open", async () => {
    const user = userEvent.setup();
    const drawerClose = vi.fn();
    const modalClose = vi.fn();
    const drawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") drawerClose();
    };
    document.addEventListener("keydown", drawerKeyDown);
    render(
      <div data-testid="drawer-panel">
        <Modal open onClose={modalClose} title="Tasks">
          Body
        </Modal>
      </div>,
    );
    await user.keyboard("{Escape}");
    expect(modalClose).toHaveBeenCalledTimes(1);
    expect(drawerClose).not.toHaveBeenCalled();
    document.removeEventListener("keydown", drawerKeyDown);
  });
});

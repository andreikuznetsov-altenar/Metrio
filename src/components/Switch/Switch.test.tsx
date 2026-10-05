// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  afterEach(() => cleanup());

  it("renders unchecked data-state", () => {
    render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Notify" />);
    expect(screen.getByRole("switch", { name: "Notify" })).toHaveAttribute(
      "data-state",
      "unchecked",
    );
  });

  it("renders checked data-state", () => {
    render(<Switch checked onCheckedChange={() => {}} aria-label="Notify" />);
    expect(screen.getByRole("switch", { name: "Notify" })).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("calls onCheckedChange when toggled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Toggle" />);
    await user.click(screen.getByRole("switch", { name: "Toggle" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch checked={false} disabled onCheckedChange={onCheckedChange} aria-label="Toggle" />,
    );
    await user.click(screen.getByRole("switch", { name: "Toggle" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("exposes aria-label", () => {
    render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Launch at login" />);
    expect(screen.getByRole("switch", { name: "Launch at login" })).toBeTruthy();
  });
});

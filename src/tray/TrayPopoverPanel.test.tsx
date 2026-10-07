import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrayPopoverPanel } from "./TrayPopoverPanel";
import { buildTraySummaryModel } from "../domain/tray/buildTraySummaryModel";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("TrayPopoverPanel", () => {
  it("renders summary rows and triggers tray actions", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const summary = buildTraySummaryModel({
      role: "manager",
      openTaskCount: 8,
      problemTaskCount: 2,
      indexLabel: "Team index",
      indexValue: "Watch",
      indexAvailable: true,
      unreadNotificationCount: 3,
    });
    render(<TrayPopoverPanel summary={summary} />);
    expect(screen.getByTestId("tray-popover")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /tray commands/i })).toBeTruthy();
    expect(screen.getByText("Open tasks")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(invoke).toHaveBeenCalledWith("tray_popover_action", { actionId: "refresh" });
  });
});

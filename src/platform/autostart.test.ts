// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DEFAULT_PREFERENCES } from "./preferences";

const enable = vi.fn();
const disable = vi.fn();
const isEnabled = vi.fn();

vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable,
  disable,
  isEnabled,
}));

describe("applyLaunchAtLogin", () => {
  beforeEach(() => {
    enable.mockReset();
    disable.mockReset();
    isEnabled.mockReset();
  });

  it("does nothing when desired state already matches", async () => {
    isEnabled.mockResolvedValue(false);
    const { applyLaunchAtLogin } = await import("./autostart");
    await applyLaunchAtLogin(false);
    expect(enable).not.toHaveBeenCalled();
    expect(disable).not.toHaveBeenCalled();
  });

  it("enables only when user opts in", async () => {
    isEnabled.mockResolvedValue(false);
    const { applyLaunchAtLogin } = await import("./autostart");
    await applyLaunchAtLogin(true);
    expect(enable).toHaveBeenCalledTimes(1);
    expect(disable).not.toHaveBeenCalled();
  });

  it("disables when user turns launch at login off", async () => {
    isEnabled.mockResolvedValue(true);
    const { applyLaunchAtLogin } = await import("./autostart");
    await applyLaunchAtLogin(false);
    expect(disable).toHaveBeenCalledTimes(1);
    expect(enable).not.toHaveBeenCalled();
  });
});

describe("general preferences defaults", () => {
  it("keeps launchAtLogin disabled by default", () => {
    expect(DEFAULT_PREFERENCES.general.launchAtLogin).toBe(false);
  });

  it("does not tie keepRunningInTray to launchAtLogin", () => {
    expect(DEFAULT_PREFERENCES.general.keepRunningInTray).toBe(true);
    expect(DEFAULT_PREFERENCES.general.launchAtLogin).toBe(false);
  });
});

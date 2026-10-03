import { describe, expect, it } from "vitest";
import { normalizeSettingsSection } from "../pages/settings/settingsSection";

describe("normalizeSettingsSection", () => {
  it("maps legacy general/notifications/digests to preferences", () => {
    expect(normalizeSettingsSection("general")).toBe("preferences");
    expect(normalizeSettingsSection("notifications")).toBe("preferences");
    expect(normalizeSettingsSection("digests")).toBe("preferences");
  });

  it("maps legacy company/about/diagnostics to company-app", () => {
    expect(normalizeSettingsSection("company")).toBe("company-app");
    expect(normalizeSettingsSection("about")).toBe("company-app");
    expect(normalizeSettingsSection("diagnostics")).toBe("company-app");
  });
});

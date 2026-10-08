// @vitest-environment jsdom
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("UI Repair Pass 10", () => {
  it("settings Google connection uses a single outer card surface", async () => {
    const settingsPage = await readFile(
      resolve(import.meta.dirname, "../pages/settings/SettingsPage.tsx"),
      "utf8",
    );
    const panel = await readFile(
      resolve(import.meta.dirname, "../pages/feedback/GoogleConnectionPanel.tsx"),
      "utf8",
    );
    expect(settingsPage).toContain('data-testid="settings-google-card"');
    expect(settingsPage).toContain("settings-card__title");
    expect(panel).not.toMatch(/mode === 'settings'[\s\S]*<Section title="Google">/);
  });

  it("select and date picker expose open accent border rules", async () => {
    const interactionCss = await readFile(
      resolve(import.meta.dirname, "../styles/ui-interaction-system.css"),
      "utf8",
    );
    expect(interactionCss).toContain('.select-trigger[data-state="open"]');
    expect(interactionCss).toContain(
      '.metrio-date-picker__trigger[data-state="open"]',
    );
    expect(interactionCss).toMatch(
      /\.select-trigger:focus-visible[\s\S]*border-color:\s*var\(--color-focus-border\)/,
    );
    expect(interactionCss).toMatch(
      /\.metrio-date-picker__trigger:focus-visible[\s\S]*border-color:\s*var\(--color-focus-border\)/,
    );
  });

  it("attention signals table shares colgroup column contract", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../pages/performance/AttentionSignalsTable.tsx"),
      "utf8",
    );
    expect(source).toContain("<colgroup>");
    expect(source).toContain("performance-table--attention-signals");
  });
});

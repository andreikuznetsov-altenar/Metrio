import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootConnected, clickSettingsSection } from "./visualBoot";

/**
 * Real-browser check of the update UI through the real @tauri-apps/plugin-updater client code.
 * Tauri IPC is mocked; GitHub is never contacted.
 */
async function mockTauriUpdater(
  page: Page,
  options: { update?: boolean; checkError?: string; installError?: string } = {},
) {
  await page.addInitScript((opts) => {
    const w = window as unknown as Record<string, unknown>;
    let callbackId = 0;
    const calls: string[] = [];
    w.__metrioUpdaterCalls = calls;
    w.__TAURI_INTERNALS__ = {
      transformCallback: (callback: unknown) => {
        callbackId += 1;
        w[`_cb${callbackId}`] = callback;
        return callbackId;
      },
      unregisterCallback: () => undefined,
      convertFileSrc: (p: string) => p,
      invoke: async (cmd: string, args: { onEvent?: { id?: number; __TAURI_CHANNEL_MARKER__?: boolean } }) => {
        calls.push(cmd);
        if (cmd === "app_get_build_info") {
          return { version: "0.1.1", commit: "abcdef1234", channel: "production", product_name: "Metrio" };
        }
        if (cmd === "plugin:updater|check") {
          if (opts.checkError) throw new Error(opts.checkError);
          if (!opts.update) return null;
          return {
            rid: 7,
            currentVersion: "0.1.1",
            version: "0.2.0",
            date: "2026-10-20T10:00:00Z",
            body: "Faster dashboards\nNew update flow",
            rawJson: {},
          };
        }
        if (cmd === "plugin:updater|download_and_install" || cmd === "plugin:updater|download") {
          if (opts.installError) throw new Error(opts.installError);
          return 8;
        }
        if (cmd === "plugin:updater|install" || cmd === "plugin:process|restart") {
          return null;
        }
        throw new Error(`unmocked tauri command ${cmd}`);
      },
    };
  }, options);
}

async function openAbout(page: Page) {
  await bootConnected(page, "lead");
  await page.getByRole("button", { name: /^settings$/i }).click();
  await clickSettingsSection(page, /company & app/i);
  await expect(page.getByTestId("about-update")).toBeVisible();
}

test.describe("PASS 23 updater UI (mocked Tauri IPC)", () => {
  test("up to date", async ({ page }) => {
    await mockTauriUpdater(page);
    await openAbout(page);
    await expect(page.getByTestId("about-meta")).toContainText("Version 0.1.1");
    await page.getByTestId("about-check-updates").click();
    await expect(page.getByTestId("about-update-status")).toHaveText("You're up to date");
    await expect(page.getByTestId("update-prompt")).toHaveCount(0);
  });

  test("update available: canonical modal with Update and restart / Later", async ({ page }) => {
    await mockTauriUpdater(page, { update: true });
    await openAbout(page);
    await page.getByTestId("about-check-updates").click();
    const prompt = page.getByTestId("update-prompt");
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText("Metrio 0.2.0 is ready to install.");
    const primary = prompt.getByRole("button", { name: "Update and restart" });
    const later = prompt.getByRole("button", { name: "Later" });
    await expect(primary).toHaveClass(/btn--primary/);
    await expect(later).toHaveClass(/btn--secondary/);
    const [a, b] = [await primary.boundingBox(), await later.boundingBox()];
    expect(a!.height).toBe(b!.height);
    const modal = page.locator(".metrio-modal");
    expect((await modal.boundingBox())!.width).toBeLessThan(700);
    await expect(modal).toHaveScreenshot("update-prompt.png", { maxDiffPixelRatio: 0.02 });

    await later.click();
    await expect(page.getByTestId("update-prompt")).toHaveCount(0);
    await expect(page.getByTestId("about-update-status")).toHaveText("Update available");
    const calls = await page.evaluate(() => (window as unknown as { __metrioUpdaterCalls: string[] }).__metrioUpdaterCalls);
    expect(calls.some((c) => c.includes("download"))).toBe(false);
  });

  test("update and restart runs download, install and relaunch", async ({ page }) => {
    await mockTauriUpdater(page, { update: true });
    await openAbout(page);
    await page.getByTestId("about-check-updates").click();
    await page.getByTestId("update-prompt").getByRole("button", { name: "Update and restart" }).click();
    await expect.poll(() =>
      page.evaluate(() => (window as unknown as { __metrioUpdaterCalls: string[] }).__metrioUpdaterCalls.join(",")),
    ).toContain("plugin:process|restart");
    const calls = await page.evaluate(() => (window as unknown as { __metrioUpdaterCalls: string[] }).__metrioUpdaterCalls);
    const installed = calls.indexOf("plugin:updater|download_and_install");
    expect(installed).toBeGreaterThan(-1);
    expect(calls.indexOf("plugin:process|restart")).toBeGreaterThan(installed);
  });

  test("check failure is non-fatal and understandable", async ({ page }) => {
    await mockTauriUpdater(page, { checkError: "error sending request for url (dns error)" });
    await openAbout(page);
    await page.getByTestId("about-check-updates").click();
    await expect(page.getByTestId("about-update-status")).toHaveText("Failed to check for updates");
    await expect(page.getByRole("alert")).toContainText("Couldn't reach the update server");
    await expect(page.getByTestId("about-check-updates")).toBeEnabled();
  });

  test("update prompt in dark theme", async ({ page }) => {
    await mockTauriUpdater(page, { update: true });
    await page.addInitScript(() => localStorage.setItem("metrio-theme", "dark"));
    await bootConnected(page, "lead", "dark");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await page.getByTestId("about-check-updates").click();
    await expect(page.getByTestId("update-prompt")).toBeVisible();
    await expect(page.locator(".metrio-modal")).toHaveScreenshot("update-prompt-dark.png", { maxDiffPixelRatio: 0.02 });
  });

  test("startup updater failure leaves Metrio usable", async ({ page }) => {
    await mockTauriUpdater(page, { checkError: "offline" });
    await bootConnected(page, "lead");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("update-prompt")).toHaveCount(0);
  });
});

import { test, expect } from "@playwright/test";

const TARGET_LOGO_WIDTH = 133;
const PREVIOUS_LOGO_WIDTH = 200;

test.describe("Auth screen logo polish", () => {
  for (const width of [1280, 1440, 1728]) {
    test(`connection logo size and position at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const screen = page.getByTestId("connection-screen");
      await expect(screen).toBeVisible({ timeout: 15_000 });
      const logo = page.getByTestId("connection-screen-logo");
      await expect(logo).toBeVisible();

      const box = await logo.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(TARGET_LOGO_WIDTH - 2);
      expect(box!.width).toBeLessThan(TARGET_LOGO_WIDTH + 2);
      const ratio = box!.width / PREVIOUS_LOGO_WIDTH;
      expect(ratio).toBeGreaterThan(0.64);
      expect(ratio).toBeLessThan(0.69);

      const panel = page.getByText("Connect your work tools");
      const panelBox = await panel.boundingBox();
      expect(panelBox).not.toBeNull();
      expect(box!.y).toBeLessThan(panelBox!.y - 20);
    });
  }

  test("connection logo light snapshot 1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("auth-connection-logo-light-1440.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("connection logo dark snapshot 1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("metrio-theme", "dark");
    });
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("auth-connection-logo-dark-1440.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

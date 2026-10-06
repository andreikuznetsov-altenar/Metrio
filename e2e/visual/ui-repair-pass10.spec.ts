import { expect, test } from "@playwright/test";
import {
  bootDashboardManager,
  bootMetrio,
  clickSettingsSection,
  setViewport,
} from "./visualBoot";

test.describe("UI Repair Pass 10 visual acceptance", () => {
  test("dashboard-attention-table", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const attention = page.getByTestId("dashboard-attention-now");
    await expect(attention).toBeVisible();
    await expect(attention).toHaveScreenshot("dashboard-attention-table.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-capacity-delivery-row", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const pair = page.getByTestId("dashboard-capacity-delivery-row");
    await expect(pair).toBeVisible();
    await expect(pair).toHaveScreenshot("dashboard-capacity-delivery-row.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-lower-three-cards", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const row = page.getByTestId("dashboard-lower-three-cards");
    await expect(row).toBeVisible();
    await expect(row).toHaveScreenshot("dashboard-lower-three-cards.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-recommendations", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const block = page.getByTestId("dashboard-recommendations");
    await expect(block).toBeVisible();
    await expect(block).toHaveScreenshot("dashboard-recommendations.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance-team-workload-alignment", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    const table = page.locator(".performance-table--team-workload");
    await expect(table).toBeVisible();
    await expect(table).toHaveScreenshot("performance-team-workload-alignment.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("connections-google-flat-card", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await clickSettingsSection(page, /connections/i);
    const card = page.getByTestId("settings-google-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("connections-google-flat-card.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("filter-select-open", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await page.getByLabel("Date range preset").click();
    await expect(page.locator(".select-content")).toBeVisible();
    await expect(page.locator(".performance-toolbar")).toHaveScreenshot("filter-select-open.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});

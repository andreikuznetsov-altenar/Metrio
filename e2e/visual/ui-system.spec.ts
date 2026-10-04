import { test, expect } from "@playwright/test";
import {
  bootConnected,
  bootMetrio,
  clickSettingsSection,
  openPerformanceFromHome,
  setViewport,
} from "./visualBoot";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await setViewport(page, 1440, 900);
});

test("ui-system-input-focus", async ({ page }) => {
  await bootMetrio(page, "lead");
  await page.getByRole("button", { name: /^settings$/i }).click();
  await clickSettingsSection(page, /^connections$/i);
  const card = page.getByTestId("settings-jira-card");
  await card.getByRole("button", { name: /^change$/i }).click();
  const field = card.getByPlaceholder(/enter new credential/i);
  await field.focus();
  await expect(page.locator(".settings-panel")).toHaveScreenshot("ui-system-input-focus.png", {
    maxDiffPixelRatio: 0.03,
  });
});

test("ui-system-select-focus", async ({ page }) => {
  await bootConnected(page, "lead", "light");
  await openPerformanceFromHome(page);
  await page.getByRole("combobox", { name: /date range preset/i }).focus();
  await expect(page.locator(".performance-toolbar")).toHaveScreenshot(
    "ui-system-select-focus.png",
    { maxDiffPixelRatio: 0.03 },
  );
});

test("ui-system-table-multiline-row", async ({ page }) => {
  await bootMetrio(page, "lead");
  await page.locator(".performance-subnav").getByRole("button", { name: /^delivery risk$/i }).click();
  await expect(page.getByTestId("delivery-risk-view")).toBeVisible();
  await expect(page.locator(".performance-table--delivery-risk")).toHaveScreenshot(
    "ui-system-table-delivery-risk.png",
    { maxDiffPixelRatio: 0.03 },
  );
});

test("ui-system-diagnostics-accordion-open", async ({ page }) => {
  await bootConnected(page, "lead", "light");
  await openPerformanceFromHome(page);
  await page.getByRole("button", { name: /^settings$/i }).click();
  await clickSettingsSection(page, /company & app/i);
  await page.getByRole("button", { name: /show advanced details/i }).click();
  await expect(page.getByTestId("diagnostics-advanced")).toBeVisible();
  await expect(page.getByTestId("diagnostics-settings")).toHaveScreenshot(
    "ui-system-diagnostics-advanced.png",
    { maxDiffPixelRatio: 0.03 },
  );
});

test("ui-system-search-sheet", async ({ page }) => {
  await bootConnected(page, "lead", "light");
  await page.keyboard.press("Meta+k");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await expect(page.getByTestId("command-palette")).toHaveScreenshot("ui-system-search-sheet.png", {
    maxDiffPixelRatio: 0.03,
  });
});

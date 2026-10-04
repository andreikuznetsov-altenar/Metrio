import { test, expect } from "@playwright/test";
import {
  bootConnected,
  bootMetrio,
  clickSettingsSection,
  openPerformanceFromHome,
  setViewport,
} from "./visualBoot";

test.beforeEach(async ({ page }) => {
  await setViewport(page, 1440, 900);
});

test("accordion opens and exposes advanced diagnostics", async ({ page }) => {
  await bootConnected(page, "lead", "light");
  await openPerformanceFromHome(page);
  await page.getByRole("button", { name: /^settings$/i }).click();
  await clickSettingsSection(page, /company & app/i);
  await page.getByRole("button", { name: /show advanced details/i }).click();
  await expect(page.getByTestId("diagnostics-advanced")).toBeVisible();
  await page.getByRole("button", { name: /hide advanced details/i }).click();
  await expect(page.locator(".metrio-collapsible.is-open")).toHaveCount(0);
});

test("select opens and closes with Escape", async ({ page }) => {
  await bootMetrio(page, "lead");
  await page.getByRole("combobox", { name: /date range preset/i }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("option")).toHaveCount(0);
});

test("delivery-risk table cells share row height", async ({ page }) => {
  await bootMetrio(page, "lead");
  await page.locator(".performance-subnav").getByRole("button", { name: /^delivery risk$/i }).click();
  const row = page.locator(".performance-table--delivery-risk tbody tr").first();
  await expect(row).toBeVisible();
  const heights = await row.locator("td").evaluateAll((cells) =>
    cells.map((cell) => cell.getBoundingClientRect().height),
  );
  expect(heights.length).toBeGreaterThan(0);
  const max = Math.max(...heights);
  const min = Math.min(...heights);
  expect(max - min).toBeLessThanOrEqual(2);
});

test("focused input does not change control height", async ({ page }) => {
  await bootMetrio(page, "lead");
  await page.getByRole("button", { name: /^settings$/i }).click();
  await clickSettingsSection(page, /^connections$/i);
  const card = page.getByTestId("settings-jira-card");
  await card.getByRole("button", { name: /^change$/i }).click();
  const field = card.getByPlaceholder(/enter new credential/i);
  const before = await field.boundingBox();
  await field.focus();
  const after = await field.boundingBox();
  expect(before?.height).toBe(after?.height);
});

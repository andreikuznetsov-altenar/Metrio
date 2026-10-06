import { test, expect } from "@playwright/test";
import { bootConnected, openPerformanceFromHome, setViewport } from "./visualBoot";

test.describe("ORG Pass 12 role surfaces", () => {
  test("leaf manager dashboard shows team scope without leadership branch note", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-direct-ic-note")).toHaveCount(0);
    await expect(page.getByTestId("dashboard-your-manager")).toHaveCount(0);
  });

  test("manager of managers hides Feedback navigation", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "director");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }),
    ).toHaveCount(0);
    await expect(page.getByTestId("dashboard-director-team-health")).toBeVisible();
    await expect(page.getByTestId("dashboard-direct-ic-note")).toBeVisible();
  });

  test("manager of managers performance shows leadership branches", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "director");
    await openPerformanceFromHome(page);
    await page.locator(".performance-subnav__link").filter({ hasText: "Teams" }).click();
    await expect(page.getByTestId("leadership-branches-performance")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("individual contributor dashboard is personal scope", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "employee");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-director-team-health")).toHaveCount(0);
    await expect(page.getByTestId("dashboard-direct-ic-note")).toHaveCount(0);
  });
});

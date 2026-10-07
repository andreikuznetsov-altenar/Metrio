import { expect, test } from "@playwright/test";
import {
  bootDashboardManager,
  bootMetrio,
  clickSubnav,
  expectPerformanceTab,
  openFirstAttentionPerson,
  setViewport,
} from "./visualBoot";
import { serializeOpenPerformanceRecommendationForPlaywright } from "../../src/fixtures/productRecommendationsVisualFixture";

test.describe("PASS 14.6A interactions", () => {
  test("My Focus Work column reorders rows on repeated sort clicks", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    await page.addInitScript(() => {
      localStorage.setItem("metrio-visual-visualDashboardUnsortedFocus", "1");
    });
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /my focus/i }).click();
    const table = page.getByTestId("dashboard-tab-focus").getByTestId("dashboard-action-queue");
    await expect(table).toBeVisible();
    const workHeader = table.getByRole("button", { name: /work/i });
    await expect(workHeader).toBeVisible();
    const before = await table.locator("tbody tr").evaluateAll((rows) =>
      rows.map((row) => row.textContent ?? ""),
    );
    await workHeader.click();
    const asc = await table.locator("tbody tr").evaluateAll((rows) =>
      rows.map((row) => row.textContent ?? ""),
    );
    await workHeader.click();
    const desc = await table.locator("tbody tr").evaluateAll((rows) =>
      rows.map((row) => row.textContent ?? ""),
    );
    expect(asc.join("|")).not.toEqual(before.join("|"));
    expect(desc.join("|")).not.toEqual(asc.join("|"));
  });

  test("Review recurring backflow Open Performance wins over stale Radar tab", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    const recommendationsJson = serializeOpenPerformanceRecommendationForPlaywright();
    await page.addInitScript(
      ({ recs }: { recs: string }) => {
        localStorage.setItem("metrio-visual-product-recommendations", recs);
        sessionStorage.setItem("metrio.performance.teamView.v1", "radar");
        (window as Window & { __ctaPointer?: boolean }).__ctaPointer = false;
      },
      { recs: recommendationsJson },
    );
    await bootDashboardManager(page);
    const cta = page.getByTestId("recommendation-cta-visual-open-performance");
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.evaluate((node) => {
      node.addEventListener(
        "pointerdown",
        () => {
          (window as Window & { __ctaPointer?: boolean }).__ctaPointer = true;
        },
        { once: true },
      );
    });
    await cta.click();
    expect(await page.evaluate(() => (window as Window & { __ctaPointer?: boolean }).__ctaPointer)).toBe(
      true,
    );
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expectPerformanceTab(page, /^overview$/i);
    await expect(page.getByTestId("performance-view-overview")).toBeVisible();
    expect(
      await page.evaluate(() => sessionStorage.getItem("metrio.performance.teamView.v1")),
    ).toBe("overview");
  });

  test("internal Performance tabs switch without loading overlay", async ({ page }) => {
    await bootMetrio(page);
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible();
    await expect(page.getByTestId("performance-content-overlay")).toHaveCount(0);
    await clickSubnav(page, /^Radar$/i);
    await expectPerformanceTab(page, /^Radar$/i);
    await expect(page.getByTestId("performance-content-overlay")).toHaveCount(0);
    await clickSubnav(page, /Delivery Risk/i);
    await expectPerformanceTab(page, /Delivery Risk/i);
    await expect(page.getByTestId("performance-content-overlay")).toHaveCount(0);
    await clickSubnav(page, /^Overview$/i);
    await expectPerformanceTab(page, /^Overview$/i);
    await expect(page.getByTestId("performance-content-overlay")).toHaveCount(0);
  });

  test("Person drawer help tooltip portals above the drawer layer", async ({ page }) => {
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    const drawer = page.getByTestId("person-detail-drawer");
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    const help = drawer.locator(".help-icon").first();
    if ((await help.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "No help icon in person drawer for this fixture; skip hover.",
      });
      return;
    }
    await help.hover();
    const tooltip = page.getByTestId("metrio-tooltip");
    await expect(tooltip).toBeVisible({ timeout: 5_000 });
    const stacking = await page.evaluate(() => {
      const tip = document.querySelector('[data-testid="metrio-tooltip"]');
      const layer = document.getElementById("app-tooltip-layer");
      const drawerLayer = document.getElementById("app-drawer-layer");
      return {
        inLayer: Boolean(layer && tip && layer.contains(tip)),
        tooltipZ: layer ? Number(getComputedStyle(layer).zIndex) : 0,
        drawerZ: drawerLayer ? Number(getComputedStyle(drawerLayer).zIndex) : 0,
      };
    });
    expect(stacking.inLayer).toBe(true);
    expect(stacking.tooltipZ).toBeGreaterThan(stacking.drawerZ);
  });
});

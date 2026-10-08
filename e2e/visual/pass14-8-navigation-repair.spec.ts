import { expect, test } from "@playwright/test";
import {
  bootDashboardManager,
  bootMetrio,
  clickSubnav,
  expectPerformanceTab,
  setViewport,
} from "./visualBoot";
import { serializeOpenPerformanceRecommendationForPlaywright } from "../../src/fixtures/productRecommendationsVisualFixture";

test.describe("PASS 14.8 navigation repair", () => {
  test("Review recurring backflow Open Performance overrides stale Radar and stays on Overview", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    const recommendationsJson = serializeOpenPerformanceRecommendationForPlaywright();
    await page.addInitScript(
      ({ recs }: { recs: string }) => {
        localStorage.setItem("metrio-visual-product-recommendations", recs);
        sessionStorage.setItem("metrio.performance.teamView.v1", "radar");
      },
      { recs: recommendationsJson },
    );
    await bootDashboardManager(page);
    const cta = page.getByTestId("recommendation-cta-visual-open-performance");
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await expect(cta).toContainText("Open Performance");
    await cta.click({ force: false });
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expectPerformanceTab(page, /^Overview$/i);
    await expect(page.getByTestId("performance-view-overview")).toBeVisible();
    await page.waitForTimeout(800);
    await expectPerformanceTab(page, /^Overview$/i);
    expect(
      await page.evaluate(() => sessionStorage.getItem("metrio.performance.teamView.v1")),
    ).toBe("overview");
  });

  test("internal Performance tabs do not show loading overlay after hydrate", async ({
    page,
  }) => {
    await bootMetrio(page);
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible();
    await expect(page.getByTestId("performance-content-overlay")).toHaveCount(0);
    for (const label of [/^Radar$/i, /Delivery Risk/i, /History reports/i, /^Overview$/i]) {
      await clickSubnav(page, label);
      await expect(page.getByTestId("performance-content-overlay")).toHaveCount(0);
    }
  });
});

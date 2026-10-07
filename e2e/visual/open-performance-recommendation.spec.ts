import { expect, test } from "@playwright/test";
import {
  bootDashboardManager,
  expectPerformanceTab,
  setViewport,
} from "./visualBoot";
import { serializeOpenPerformanceRecommendationForPlaywright } from "../../src/fixtures/productRecommendationsVisualFixture";

test.describe("Open Performance recommendation", () => {
  test("open_performance CTA opens Performance overview despite stale session tab", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    const recommendationsJson = serializeOpenPerformanceRecommendationForPlaywright();
    await page.addInitScript(
      ({ recs }: { recs: string }) => {
        localStorage.setItem("metrio-visual-product-recommendations", recs);
        sessionStorage.setItem("metrio.performance.teamView.v1", "goals");
      },
      { recs: recommendationsJson },
    );
    await bootDashboardManager(page);
    const cta = page
      .getByTestId("dashboard-recommendations")
      .getByRole("button", { name: /^open performance$/i });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expectPerformanceTab(page, /^overview$/i);
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("metrio.performance.teamView.v1"),
      ),
    ).toBe("overview");
  });
});

import { expect, test } from "@playwright/test";
import { bootDashboardManager, setViewport } from "./visualBoot";
import { serializeViewPersonRecommendationForPlaywright } from "../../src/fixtures/productRecommendationsVisualFixture";

test.describe("View person recommendation", () => {
  test("view_person CTA opens person detail drawer from dashboard", async ({ page }) => {
    await setViewport(page, 1440, 900);
    const recommendationsJson = serializeViewPersonRecommendationForPlaywright();
    await page.addInitScript(
      ({ recs }: { recs: string }) => {
        localStorage.setItem("metrio-visual-product-recommendations", recs);
      },
      { recs: recommendationsJson },
    );
    await bootDashboardManager(page);
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const cta = page
      .getByTestId("dashboard-recommendations")
      .getByRole("button", { name: /^view person$/i });
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.click();
    const drawer = page.getByTestId("person-detail-drawer");
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });
});

import { expect, test } from "@playwright/test";
import { serializeOpenPerformanceRecommendationForPlaywright } from "../../src/fixtures/productRecommendationsVisualFixture";
import { bootDashboardManager, bootMetrio, setViewport } from "./visualBoot";

test.describe("PASS 14.10C pointer and spacing", () => {
  test("Open Performance center hit-test is the button, then a real pointer click opens Overview", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    const recommendationsJson = serializeOpenPerformanceRecommendationForPlaywright();
    await page.addInitScript((recs: string) => {
      localStorage.setItem("metrio-visual-product-recommendations", recs);
      sessionStorage.setItem("metrio.performance.teamView.v1", "radar");
    }, recommendationsJson);
    await bootDashboardManager(page);

    const cta = page.getByTestId("recommendation-cta-visual-open-performance");
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await cta.scrollIntoViewIfNeeded();
    const box = await cta.boundingBox();
    expect(box).toBeTruthy();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    const hit = await page.evaluate(({ x, y, box }) => {
      const own = document.querySelector("[data-testid='recommendation-cta-visual-open-performance']") as HTMLElement | null;
      const ownRect = own?.getBoundingClientRect();
      const ownHit = ownRect
        ? (document.elementFromPoint(
            ownRect.left + ownRect.width / 2,
            ownRect.top + ownRect.height / 2,
          ) as HTMLElement | null)
        : null;
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const button = el?.closest("button");
      const inactive = document.querySelector(
        "[data-testid='route-layer-performance'][hidden], [data-testid='route-layer-home'][hidden]",
      );
      const chain: string[] = [];
      let node: HTMLElement | null = el;
      for (let i = 0; node && i < 8; i += 1) {
        const style = getComputedStyle(node);
        chain.push(
          `${node.tagName}.${String(node.className).slice(0, 80)} testid=${node.getAttribute("data-testid") ?? ""} pe=${style.pointerEvents} z=${style.zIndex}`,
        );
        node = node.parentElement;
      }
      return {
        box,
        ownRect: ownRect
          ? { x: ownRect.x, y: ownRect.y, w: ownRect.width, h: ownRect.height }
          : null,
        ownHit: ownHit
          ? `${ownHit.tagName} ${ownHit.getAttribute("data-testid") ?? ""} ${ownHit.className}`
          : null,
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        testId: button?.getAttribute("data-testid") ?? el?.getAttribute("data-testid"),
        tag: el?.tagName ?? null,
        text: el?.textContent?.trim().slice(0, 80) ?? null,
        insideButton: Boolean(button?.getAttribute("data-testid")?.startsWith("recommendation-cta-")),
        inactiveLayer: Boolean(inactive),
        performanceLayer: Boolean(document.querySelector("[data-testid='route-layer-performance']")),
        chain,
      };
    }, { x, y, box });

    expect(hit.insideButton, JSON.stringify(hit)).toBe(true);
    expect(hit.testId).toBe("recommendation-cta-visual-open-performance");
    expect(hit.inactiveLayer).toBe(false);
    expect(hit.performanceLayer).toBe(false);

    await page.mouse.click(x, y);
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("performance-view-overview")).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: /^Overview$/i })).toHaveClass(/is-active/);
    await expect(page.getByTestId("performance-view-overview")).toBeVisible();
  });

  for (const width of [1280, 1440, 1728]) {
    test(`Performance top-level sections keep a shared gap at ${width}`, async ({ page }) => {
      await setViewport(page, width, 900);
      await bootMetrio(page);
      await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible();
      const gap = await page.evaluate(() => {
        const recommendations = document.querySelector("[data-testid='performance-recommendations']");
        const metrics = document.querySelector("[aria-label='Summary metrics']");
        const attention = document.getElementById("performance-section-team-attention");
        const trends = document.querySelector("[aria-label='Team trends']");
        const space = (top: Element | null, bottom: Element | null) => {
          if (!top || !bottom) return null;
          return Math.round(bottom.getBoundingClientRect().top - top.getBoundingClientRect().bottom);
        };
        return {
          recommendationsToMetrics: space(recommendations, metrics),
          metricsToAttention: space(metrics, attention),
          attentionToTrends: space(attention, trends),
        };
      });
      for (const value of Object.values(gap)) {
        expect(value).not.toBeNull();
        expect(value!).toBeGreaterThanOrEqual(16);
        expect(value!).toBeLessThanOrEqual(40);
      }
    });
  }
});

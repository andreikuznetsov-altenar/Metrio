import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { VISUAL_PRODUCT_RECOMMENDATIONS_STORAGE_KEY } from "../../src/fixtures/productRecommendationsVisualFixture";
import { bootConnected, openPerformanceFromHome, setViewport } from "./visualBoot";

const RECOMMENDATIONS = Array.from({ length: 6 }, (_, i) => ({
  id: `real-carousel-${i + 1}`,
  severity: i % 2 ? "watch" : "critical",
  title: `Recommendation ${i + 1}`,
  explanation: `Deterministic card ${i + 1} used to render the REAL shared carousel component.`,
  actionLabel: "Open Delivery Risk",
  actionKind: "open_delivery_risk",
  priority: i + 1,
}));

type Surface = "performance" | "dashboard";

async function boot(page: Page, surface: Surface, theme: "light" | "dark", width: number) {
  await setViewport(page, width, 900);
  await page.addInitScript(
    ({ key, items }) => localStorage.setItem(key, JSON.stringify(items)),
    { key: VISUAL_PRODUCT_RECOMMENDATIONS_STORAGE_KEY, items: RECOMMENDATIONS },
  );
  await bootConnected(page, "lead", theme);
  if (surface === "performance") await openPerformanceFromHome(page);
  const root = page.getByTestId(surface === "performance" ? "performance-recommendations" : "dashboard-recommendations");
  const rail = root.locator(".executive-recommendations__list--carousel");
  await expect(rail).toBeVisible({ timeout: 30_000 });
  await rail.evaluate((el) => ((el as HTMLElement).style.scrollBehavior = "auto"));
  return { root, rail };
}

const measure = (page: Page, surface: Surface) =>
  page.evaluate((testId) => {
    const root = document.querySelector(`[data-testid='${testId}']`) as HTMLElement;
    const ul = root.querySelector(".executive-recommendations__list--carousel") as HTMLElement;
    const section = root.matches("section") ? root : (root.querySelector("section") as HTMLElement) ?? root;
    const r = ul.getBoundingClientRect();
    const content = (ul.parentElement as HTMLElement).getBoundingClientRect();
    const cards = Array.from(ul.children).map((c) => c.getBoundingClientRect());
    const next = document.querySelector("[data-testid='recommendations-next']")!.getBoundingClientRect();
    const prev = document.querySelector("[data-testid='recommendations-prev']")!.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(ul).columnGap) || 0;
    void section;
    return {
      railL: r.left, railR: r.right, cl: content.left, cr: content.right, vw: window.innerWidth,
      cards: cards.map((c) => ({ l: c.left, r: c.right, w: c.width })),
      navR: next.right, prevL: prev.left, gap,
      scrollLeft: ul.scrollLeft, max: ul.scrollWidth - ul.clientWidth,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      bodyOverflowX: getComputedStyle(document.documentElement).overflowX,
    };
  }, surface === "performance" ? "performance-recommendations" : "dashboard-recommendations");

for (const surface of ["performance", "dashboard"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of [1280, 1440, 1728]) {
      test(`REAL carousel is full-bleed: start / middle / end (${surface} ${theme} ${width})`, async ({ page }) => {
        const { rail } = await boot(page, surface, theme, width);

        const start = await measure(page, surface);
        expect(Math.abs(start.railL)).toBeLessThanOrEqual(1);
        expect(Math.abs(start.railR - start.vw)).toBeLessThanOrEqual(1);
        expect(start.scrollLeft).toBe(0);
        expect(Math.abs(start.cards[0]!.l - start.cl)).toBeLessThanOrEqual(1); // first card on the content grid
        expect(start.cards[0]!.l).toBeGreaterThan(8); // no fake previous fragment
        expect(start.cards[2]!.l).toBeLessThan(start.cr); // next card continues through the right gutter
        expect(start.cards[2]!.r).toBeGreaterThan(start.vw); // …clipped only at the window edge
        expect(start.navR).toBeLessThanOrEqual(start.cr + 1); // arrows stay on the content grid
        expect(start.prevL).toBeGreaterThan(start.cl);
        expect(start.overflow).toBeLessThanOrEqual(0);
        const cardW = start.cards[0]!.w;

        await page.getByTestId("recommendations-next").click();
        await page.waitForTimeout(700);
        const mid = await measure(page, surface);
        expect(mid.scrollLeft).toBeGreaterThan(0);
        expect(mid.cards[0]!.l).toBeLessThan(mid.cl); // previous card extends through the left gutter
        expect(mid.cards[0]!.r).toBeGreaterThan(mid.cl); // …visibly into the content area
        expect(mid.cards[0]!.l).toBeLessThan(0); // clipped at the window edge, not the content boundary
        expect(mid.cards.at(-1)!.r).toBeGreaterThan(mid.vw);
        expect(Math.abs(mid.cards[1]!.w - cardW)).toBeLessThanOrEqual(0.5); // width unchanged
        expect(mid.overflow).toBeLessThanOrEqual(0);

        await rail.evaluate((el) => ((el as HTMLElement).scrollLeft = 99999));
        await page.waitForTimeout(500);
        const end = await measure(page, surface);
        expect(end.scrollLeft).toBe(end.max);
        expect(Math.abs(end.cards.at(-1)!.r - end.cr)).toBeLessThanOrEqual(1); // last card aligns naturally
        expect(end.cards.at(-2)!.r).toBeGreaterThan(0);
        expect(end.overflow).toBeLessThanOrEqual(0);
        expect(Math.abs(end.cards[1]!.l - end.cards[0]!.r - start.gap)).toBeLessThanOrEqual(0.5); // gap unchanged
      });
    }
  }
}

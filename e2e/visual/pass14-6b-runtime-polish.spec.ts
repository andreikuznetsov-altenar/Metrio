import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  bootDashboardManager,
  bootDashboardWithCache,
  bootMetrio,
  clickSubnav,
  setViewport,
} from "./visualBoot";

async function assertNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible({ timeout: 15_000 });
  const geometry = await locator.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

async function assertRadarActionGeometry(page: Page) {
  const view = page.getByTestId("team-radar-view");
  await expect(view).toBeVisible({ timeout: 15_000 });
  const buttons = view.locator(".performance-table__radar-action");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(1);
  const widths = await buttons.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = window.getComputedStyle(node);
      return {
        width: Math.round(node.getBoundingClientRect().width),
        whiteSpace: style.whiteSpace,
        paddingLeft: Number.parseFloat(style.paddingLeft),
        paddingRight: Number.parseFloat(style.paddingRight),
      };
    }),
  );
  const first = widths[0];
  expect(first).toBeTruthy();
  for (const item of widths) {
    expect(item.width).toBe(first.width);
    expect(item.whiteSpace).toBe("nowrap");
    expect(item.paddingLeft).toBeGreaterThanOrEqual(12);
    expect(item.paddingRight).toBeGreaterThanOrEqual(12);
  }
  await assertNoHorizontalOverflow(page.locator(".performance-table-wrap--radar"));
}

test.describe("PASS 14.6B runtime polish", () => {
  for (const width of [1280, 1440, 1728] as const) {
    test(`Radar action buttons share one width and do not overflow at ${width}`, async ({
      page,
    }) => {
      await setViewport(page, width, 900);
      await bootMetrio(page);
      await clickSubnav(page, /^Radar$/i);
      await assertRadarActionGeometry(page);
    });
  }

  test("Delivery Risk and History stay without horizontal overflow at 1280", async ({
    page,
  }) => {
    await setViewport(page, 1280, 900);
    await page.addInitScript((reports) => {
      localStorage.setItem("metrio-visual-report-history", JSON.stringify(reports));
    }, [
      {
        id: "pass14-6b-report",
        filename: "metrio-pass14-team-report.pdf",
        createdAt: "2026-10-07T09:00:00.000Z",
      },
    ]);
    await bootMetrio(page);
    await clickSubnav(page, /Delivery Risk/i);
    await assertNoHorizontalOverflow(
      page.locator(".performance-table-wrap--delivery-risk"),
    );
    await clickSubnav(page, /History reports/i);
    await assertNoHorizontalOverflow(
      page.locator(".performance-table-wrap--report-history"),
    );
  });

  test("Time Off empty state icon-to-text gap is 8px", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await page.addInitScript(() => {
      localStorage.setItem("metrio-visual-empty-timeoff", "1");
    });
    await bootMetrio(page);
    const empty = page.getByTestId("time-off-empty-state");
    if (!(await empty.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    const gap = await empty.evaluate((el) => {
      const icon = el.querySelector(".performance-empty__icon");
      const text = el.querySelector(".performance-empty__message");
      if (!icon || !text) return -1;
      const iconBox = icon.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      return Math.round(textBox.top - iconBox.bottom);
    });
    expect(gap).toBe(8);
    await expect
      .poll(async () => empty.evaluate((el) => window.getComputedStyle(el).gap))
      .toBe("8px");
  });

  test("A: cached usable data + successful refresh shows no global error panel", async ({
    page,
  }) => {
    await bootDashboardWithCache(page, { width: 1440 });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("global-refresh-status-panel")).toHaveCount(0);
    await expect(page.getByTestId("dashboard-sync-status")).toHaveCount(0);
  });

  test("B: cached usable data + refresh failure shows one global bottom panel", async ({
    page,
  }) => {
    await bootDashboardWithCache(page, { width: 1440, failRefresh: true });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const panel = page.getByTestId("global-refresh-status-panel");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText("Couldn't refresh data. Showing the last successful result.");
    await expect(panel).not.toContainText("Couldn't refresh performance data.");
    await expect(page.getByTestId("global-refresh-status-retry")).toBeVisible();
    await expect(page.getByTestId("dashboard-sync-status")).toHaveCount(0);
    await expect(
      page.locator(".performance-status-banner--partial").filter({
        hasText: /Couldn't refresh data/,
      }),
    ).toHaveCount(0);
    const box = await panel.boundingBox();
    const shell = await page.getByTestId("app-shell").boundingBox();
    expect(box && shell).toBeTruthy();
    if (box && shell) {
      expect(box.y + box.height).toBeGreaterThan(shell.y + shell.height - 56);
    }
  });

  test("C: Dashboard → Performance → Delivery Risk keeps one global panel and no local copies", async ({
    page,
  }) => {
    await bootDashboardWithCache(page, { width: 1440, failRefresh: true });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("global-refresh-status-panel")).toBeVisible();
    await page.locator(".app-header__nav-link").filter({ hasText: "Performance" }).click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("global-refresh-status-panel")).toHaveCount(1);
    await expect(
      page.locator(".performance-status-banner--partial").filter({
        hasText: /Couldn't refresh data/,
      }),
    ).toHaveCount(0);
    await clickSubnav(page, /Delivery Risk/i);
    await expect(page.getByTestId("delivery-risk-view")).toBeVisible();
    await expect(page.getByTestId("global-refresh-status-panel")).toHaveCount(1);
    await expect(page.getByText("Couldn't refresh performance data.")).toHaveCount(0);
  });

  test("D: Retry success slides the panel down and unmounts it", async ({ page }) => {
    await bootDashboardWithCache(page, { width: 1440, failRefresh: true });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const panel = page.getByTestId("global-refresh-status-panel");
    await expect(panel).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem("metrio-visual-performance-fail");
    });
    await page.getByTestId("global-refresh-status-retry").click();
    await expect(panel).toHaveAttribute("data-phase", "exit", { timeout: 10_000 });
    await expect(page.getByTestId("global-refresh-status-panel")).toHaveCount(0, {
      timeout: 5_000,
    });
  });

  test("E: Retry failure keeps a single stable panel", async ({ page }) => {
    await bootDashboardWithCache(page, { width: 1440, failRefresh: true });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const panel = page.getByTestId("global-refresh-status-panel");
    await expect(panel).toBeVisible();
    await page.getByTestId("global-refresh-status-retry").click();
    await expect(page.getByTestId("global-refresh-status-panel")).toHaveCount(1);
    await expect(panel).toBeVisible();
    await expect(panel).not.toHaveAttribute("data-phase", "hidden");
  });

  test("F: initial fetch failure without cache stays blocking, not the bottom panel", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.removeItem("metrio-visual-dashboard-cache");
      localStorage.setItem("metrio-visual-performance-fail", "1");
    });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-blocking-error")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("global-refresh-status-panel")).toHaveCount(0);
  });

  test("Dashboard ready content has no local refresh Retry next to Updated metadata", async ({
    page,
  }) => {
    await bootDashboardManager(page, { width: 1440 });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Updated /)).toBeVisible();
    await expect(page.getByTestId("dashboard-sync-status")).toHaveCount(0);
    await expect(page.getByTestId("global-refresh-status-panel")).toHaveCount(0);
  });
});

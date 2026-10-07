import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  bootConnected,
  bootDashboardManager,
  bootMetrio,
  bootMetrioFeedback,
  clickSubnav,
  openPerformanceFromHome,
  setViewport,
} from "./visualBoot";

const SHOT = { maxDiffPixelRatio: 0.02 };
const ALIGN_TOLERANCE_PX = 2;

async function contentLeft(locator: Locator) {
  return locator.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().left;
  });
}

async function assertTableColumnAlignment(
  page: Page,
  table: Locator,
  columnIndex: number,
) {
  const header = table.locator("thead th").nth(columnIndex);
  const cell = table.locator("tbody tr").first().locator("td").nth(columnIndex);
  await expect(header).toBeVisible();
  await expect(cell).toBeVisible();
  const headerX = await contentLeft(header);
  const bodyX = await contentLeft(cell);
  expect(Math.abs(headerX - bodyX)).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
}

test.describe("UI Repair Pass 13 acceptance", () => {
  test("table-alignment-team-workload", async ({ page }) => {
    await bootConnected(page);
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^overview$/i);
    const table = page.locator(".performance-table--team-workload");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0);
    await assertTableColumnAlignment(page, table, 1);
  });

  test("table-alignment-team-attention", async ({ page }) => {
    await bootConnected(page);
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^overview$/i);
    const table = page.locator(".performance-table--attention");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0);
    await assertTableColumnAlignment(page, table, 1);
  });

  test("metric-selector", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const select = page.getByTestId("dashboard-primary-trend").locator(".ui-select__trigger");
    await expect(select).toBeVisible();
    await expect(select).toHaveScreenshot("metric-selector-idle.png", SHOT);
    await select.click();
    await expect(page.locator(".ui-select__content")).toBeVisible();
    await expect(page.getByTestId("dashboard-primary-trend")).toHaveScreenshot(
      "metric-selector-open.png",
      SHOT,
    );
  });

  test("team-attention-count-link", async ({ page }) => {
    await bootConnected(page);
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^overview$/i);
    const link = page.getByTestId("team-attention-row").getByRole("button").first();
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    await expect(page.getByTestId("task-list-modal")).toBeVisible();
  });

  test("task-modal", async ({ page }) => {
    await bootConnected(page);
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^overview$/i);
    await page.getByTestId("show-grouped-tasks").first().click();
    const modal = page.getByTestId("task-list-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveScreenshot("task-modal-pass13.png", SHOT);
  });

  test("empty-dashboard-cold-start", async ({ page }) => {
    await bootMetrio(page, { visualHomeState: "first-run" });
    await expect(page.getByText("No performance data yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /open performance/i })).toBeVisible();
  });

  test("attention-now-links", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const panel = page.getByTestId("dashboard-attention-now");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: /^view$/i }).first()).toBeVisible();
  });

  test("recommendations-3-items", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const list = page.getByTestId("dashboard-recommendations").locator(
      ".executive-recommendations__list",
    );
    await expect(list).toBeVisible();
    await expect(list).toHaveScreenshot("recommendations-pass13.png", SHOT);
  });

  test("table-alignment-feedback", async ({ page }) => {
    await bootMetrioFeedback(page);
    await page.getByRole("tab", { name: /delivery/i }).click();
    const table = page.getByTestId("feedback-delivery-table").locator("table");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0);
  });
});

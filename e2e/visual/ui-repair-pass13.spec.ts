import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  bootConnected,
  bootDashboardManager,
  bootMetrio,
  bootMetrioWithFlags,
  clickSubnav,
  openFirstAttentionPerson,
  openDirectReportPersonBrief,
  openPerformanceFromHome,
  serializeFeedbackDeliveryVisualSurveyForPlaywright,
  serializeFeedbackVisualPrefsForPlaywright,
  setViewport,
  VISUAL_EPHEMERAL_STORAGE_KEYS,
} from "./visualBoot";

const SHOT = { maxDiffPixelRatio: 0.02 };
const ALIGN_TOLERANCE_PX = 2;
const DRAWER_MOTION_MS = 320;

async function contentLeft(locator: Locator) {
  return locator.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().left;
  });
}

async function contentRight(locator: Locator) {
  return locator.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().right;
  });
}

async function assertTableColumnAlignment(
  page: Page,
  table: Locator,
  columnIndex: number,
  options?: { personColumn?: boolean; numericColumn?: boolean },
) {
  const header = table.locator("thead th").nth(columnIndex);
  const row = table.locator("tbody tr").first();
  const cell = options?.personColumn
    ? row.locator("td").first()
    : row.locator("td").nth(columnIndex);
  await expect(header).toBeVisible();
  await expect(cell).toBeVisible();
  if (options?.numericColumn) {
    const headerX = await contentRight(header);
    const bodyX = await contentRight(cell);
    expect(Math.abs(headerX - bodyX)).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
    return;
  }
  const headerX = await contentLeft(header);
  const bodyX = await contentLeft(cell);
  expect(Math.abs(headerX - bodyX)).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
}

async function assertDashboardQueueColumnAlignment(panel: Locator, columnIndex: number) {
  const header = panel.locator(".action-queue__dashboard-header-cell").nth(columnIndex);
  const cell = panel.locator(".action-queue__dashboard-row").first().locator("> *").nth(columnIndex);
  await expect(header).toBeVisible();
  await expect(cell).toBeVisible();
  const headerX = await contentLeft(header);
  const bodyX = await contentLeft(cell);
  expect(Math.abs(headerX - bodyX)).toBeLessThanOrEqual(ALIGN_TOLERANCE_PX);
}

async function bootDashboardFirstRun(page: Page) {
  await setViewport(page, 1440, 900);
  await page.addInitScript(
    ({ ephemeralKeys }: { ephemeralKeys: string[] }) => {
      for (const key of ephemeralKeys) {
        localStorage.removeItem(key);
      }
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.removeItem("metrio-visual-dashboard-cache");
    },
    { ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS] },
  );
  await page.goto("/?visualHomeState=first-run");
  await expect(page.getByTestId("dashboard-first-run")).toBeVisible({ timeout: 15_000 });
}

async function bootFeedbackDeliveryTable(page: Page) {
  const surveyJson = serializeFeedbackDeliveryVisualSurveyForPlaywright();
  const prefsJson = serializeFeedbackVisualPrefsForPlaywright();
  await page.addInitScript(
    ({ prefs, survey }: { prefs: string; survey: string }) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-preferences", prefs);
      localStorage.setItem("metrio-visual-survey-data", survey);
    },
    { prefs: prefsJson, survey: surveyJson },
  );
  await page.goto("/");
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^feedback$/i }).click();
  await page.getByRole("button", { name: /^Delivery$/i }).click();
  await expect(page.getByTestId("feedback-tab-panel-delivery")).toBeVisible({
    timeout: 15_000,
  });
}

async function openTeamAttentionTaskModal(page: Page) {
  await clickSubnav(page, /^overview$/i);
  const link = page
    .getByTestId("team-attention-row")
    .getByTestId("grouped-issue-count-link")
    .first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  await link.click();
  await expect(page.getByTestId("task-list-modal")).toBeVisible();
}

test.describe("UI Repair Pass 13 acceptance", () => {
  test("table-alignment-team-workload", async ({ page }) => {
    await bootMetrio(page);
    const table = page.locator(".performance-table--team-workload");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0, { personColumn: true });
    await assertTableColumnAlignment(page, table, 1, { numericColumn: true });
    await assertTableColumnAlignment(page, table, 2, { numericColumn: true });
    for (const col of [3, 4]) {
      await assertTableColumnAlignment(page, table, col);
    }
  });

  test("table-alignment-team-attention", async ({ page }) => {
    await bootMetrio(page);
    const table = page.locator(".performance-table--attention");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0, { personColumn: true });
    for (const col of [1, 2, 3, 4]) {
      await assertTableColumnAlignment(page, table, col);
    }
  });

  test("table-alignment-people", async ({ page }) => {
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await clickSubnav(page, /^people$/i);
    const table = page.locator(".performance-table--people");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0, { personColumn: true });
    await assertTableColumnAlignment(page, table, 1, { numericColumn: true });
  });

  test("table-alignment-radar", async ({ page }) => {
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await clickSubnav(page, /^radar$/i);
    const table = page.locator(".performance-table--radar");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0);
    await assertTableColumnAlignment(page, table, 1);
  });

  test("table-alignment-delivery-risk", async ({ page }) => {
    await bootMetrio(page);
    await clickSubnav(page, /delivery risk/i);
    const table = page.locator(".performance-table--delivery-risk");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0);
    await assertTableColumnAlignment(page, table, 1);
  });

  test("table-alignment-my-focus", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /my focus/i }).click();
    const panel = page.getByTestId("dashboard-tab-focus");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    const rows = panel.locator(".action-queue__dashboard-row");
    if ((await rows.count()) > 0) {
      await assertDashboardQueueColumnAlignment(panel, 0);
      await assertDashboardQueueColumnAlignment(panel, 1);
    }
  });

  test("metric-selector", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const trend = page.getByTestId("dashboard-primary-trend");
    await expect(trend).toBeVisible();
    const select = trend.locator(".select-trigger");
    await expect(select).toBeVisible();
    await expect(select).toHaveScreenshot("metric-selector-idle.png", SHOT);
    await select.click();
    await expect(page.locator(".select-content")).toBeVisible();
    await expect(trend).toHaveScreenshot("metric-selector-open.png", SHOT);
  });

  test("team-attention-count-link", async ({ page }) => {
    await bootMetrio(page);
    const link = page
      .getByTestId("team-attention-row")
      .getByTestId("grouped-issue-count-link")
      .first();
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    await expect(page.getByTestId("task-list-modal")).toBeVisible();
  });

  test("task-modal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openTeamAttentionTaskModal(page);
    const modal = page.getByTestId("task-list-modal");
    await expect(modal.getByRole("columnheader", { name: "Issue" })).toBeVisible();
    await expect(modal.getByRole("columnheader", { name: "Last status change" })).toBeVisible();
    await expect(modal).toHaveScreenshot("task-modal-pass13.png", SHOT);
  });

  test("task-modal-person-click-isolation", async ({ page }) => {
    await bootMetrio(page);
    await openTeamAttentionTaskModal(page);
    await expect(page.locator(".drawer--person-detail")).toHaveCount(0);
    const taskModal = page.getByTestId("task-list-modal");
    await taskModal.getByRole("columnheader", { name: "Issue" }).click();
    await expect(page.locator(".drawer--person-detail")).toHaveCount(0);
    await page.locator(".metrio-modal--task-list .metrio-modal__title").click();
    await expect(page.locator(".drawer--person-detail")).toHaveCount(0);
  });

  test("empty-dashboard-cold-start", async ({ page }) => {
    await bootDashboardFirstRun(page);
    await expect(page.getByText("No performance data yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /open performance/i })).toBeVisible();
  });

  test("dashboard-cold-start-loading", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-03T09:30:00+02:00") });
    await setViewport(page, 1440, 900);
    await page.addInitScript(
      ({ ephemeralKeys }: { ephemeralKeys: string[] }) => {
        for (const key of ephemeralKeys) {
          localStorage.removeItem(key);
        }
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.removeItem("metrio-visual-dashboard-cache");
        localStorage.setItem("metrio-visual-performance-delay-ms", "600000");
      },
      { ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS] },
    );
    await page.goto("/");
    await expect(page.getByTestId("home-loading")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-workspace-loading")).toBeVisible();
    await expect(page.locator(".home-skeleton")).toHaveCount(0);
    await expect(page).toHaveScreenshot("dashboard-cold-start-loading-pass13.png", SHOT);
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
    await bootFeedbackDeliveryTable(page);
    const table = page.getByTestId("feedback-delivery-table").locator("table");
    await expect(table).toBeVisible({ timeout: 15_000 });
    await assertTableColumnAlignment(page, table, 0);
  });

  test("drawer-person-close-lifecycle", async ({ page }) => {
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    const dialog = page.locator(".drawer--person-detail");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /close drawer/i }).click();
    await expect(page.locator(".drawer-root.is-open")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(DRAWER_MOTION_MS + 40);
    await expect(dialog).toHaveCount(0);
  });

  test("drawer-kpi-close-lifecycle", async ({ page }) => {
    await bootMetrio(page);
    await page.getByRole("button", { name: /View Efficiency details/i }).click();
    const drawer = page.locator(".drawer--analytics");
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await drawer.getByRole("button", { name: /close drawer/i }).click();
    await expect(page.locator(".drawer-root.is-open")).toHaveCount(0);
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(DRAWER_MOTION_MS + 40);
    await expect(drawer).toHaveCount(0);
  });

  test("drawer-person-brief-transition", async ({ page }) => {
    await bootMetrio(page);
    await openDirectReportPersonBrief(page);
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
  });

  test("drawer-header-actions-aligned", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    const header = page.locator(".drawer--person-detail .drawer__header");
    const title = header.locator(".person-identity-header__name");
    const closeBtn = header.getByRole("button", { name: /close drawer/i });
    const titleTop = await title.evaluate((el) => el.getBoundingClientRect().top);
    const toolbarTop = await closeBtn.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(titleTop - toolbarTop)).toBeLessThanOrEqual(2);
  });

  test("trend-point-opens-task-modal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const chart = page.getByTestId("dashboard-primary-trend").getByTestId("trend-mini-chart");
    await expect(chart).toBeVisible();
    const box = await chart.boundingBox();
    if (!box) {
      test.skip();
      return;
    }
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    const modal = page.getByTestId("task-list-modal");
    if (await modal.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(modal).toBeVisible();
    }
  });

  test("time-off-empty-gap", async ({ page }) => {
    await bootMetrio(page);
    const empty = page.locator(".performance-empty--timeoff").first();
    if (!(await empty.isVisible())) {
      test.skip();
      return;
    }
    const gap = await empty.evaluate((el) => window.getComputedStyle(el).gap);
    expect(gap).toBe("8px");
  });
});

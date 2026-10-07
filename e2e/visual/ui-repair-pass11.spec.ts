import { expect, test, type Page } from "@playwright/test";
import {
  assertTableHeadersNowrap,
  bootConnected,
  bootDashboardManager,
  bootMetrio,
  bootMetrioWithFlags,
  clickSubnav,
  expectPerformanceTab,
  openFirstAttentionPerson,
  openPerformanceFromHome,
  setViewport,
} from "./visualBoot";

const SHOT = { maxDiffPixelRatio: 0.02 };

async function openGroupedTaskModalFromOverview(page: Page) {
  await clickSubnav(page, /^overview$/i);
  const showTasks = page.getByTestId("show-grouped-tasks").first();
  await expect(showTasks).toBeVisible({ timeout: 15_000 });
  await showTasks.click();
  await expect(page.getByTestId("task-list-modal")).toBeVisible();
}

test.describe("UI Repair Pass 11 visual acceptance", () => {
  test("dashboard-refreshing-button-only", async ({ page }) => {
    await bootDashboardManager(page, {
      width: 1440,
      performanceRefreshDelayMs: 2500,
    });
    await page.getByTestId("dashboard-refresh-button").click();
    const refreshBtn = page.getByTestId("dashboard-refresh-button");
    await expect(refreshBtn).toHaveText(/refreshing/i);
    await expect(refreshBtn).toBeDisabled();
    const sync = page.getByTestId("dashboard-sync-status");
    if (await sync.isVisible()) {
      await expect(sync).not.toContainText(/refreshing/i);
    }
  });

  test("dashboard-refresh-width-stable", async ({ page }) => {
    await bootDashboardManager(page, {
      width: 1440,
      performanceRefreshDelayMs: 2500,
    });
    const header = page.getByTestId("dashboard-executive-header");
    const refresh = page.getByTestId("dashboard-refresh-button");
    await expect(refresh).toHaveScreenshot("dashboard-refresh-idle.png", SHOT);
    await refresh.click();
    await expect(refresh).toHaveText(/refreshing/i);
    await expect(header).toHaveScreenshot("dashboard-refresh-active.png", SHOT);
  });

  test("dashboard-recommendations-horizontal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await expect(page.getByTestId("dashboard-recommendations")).toHaveScreenshot(
      "dashboard-recommendations-horizontal.png",
      SHOT,
    );
  });

  test("dashboard-recommendation-cta-compact", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const panel = page.getByTestId("dashboard-recommendations");
    await expect(panel).toBeVisible();
    await expect(panel.locator(".executive-recommendations__item").first()).toHaveScreenshot(
      "dashboard-recommendation-cta-compact.png",
      SHOT,
    );
  });

  test("dashboard-capacity-delivery-horizontal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await expect(page.getByTestId("dashboard-capacity-delivery-row")).toHaveScreenshot(
      "dashboard-capacity-delivery-horizontal.png",
      SHOT,
    );
  });

  test("dashboard-lower-three-horizontal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page, { goals: true });
    await expect(page.getByTestId("dashboard-lower-three-cards")).toHaveScreenshot(
      "dashboard-lower-three-horizontal.png",
      SHOT,
    );
  });

  test("dashboard-goal-reviews-flat", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page, { goals: true });
    const card = page.getByTestId("home-goals-summary");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.locator(".home-card")).toHaveCount(0);
    await expect(card).toHaveScreenshot("dashboard-goal-reviews-flat.png", SHOT);
  });

  test("dashboard-lower-cta-compact", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page, { goals: true });
    const lower = page.getByTestId("dashboard-lower-three-cards");
    await expect(lower.getByRole("button", { name: /open goals/i })).toBeVisible();
    await expect(lower).toHaveScreenshot("dashboard-lower-cta-compact.png", SHOT);
  });

  test("cta-open-goals", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page, { goals: true });
    await page
      .getByTestId("home-goals-summary")
      .getByRole("button", { name: /open goals/i })
      .click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 15_000,
    });
    await expectPerformanceTab(page, /^goals$/i);
  });

  test("cta-open-delivery-risk", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page, { goals: true });
    await page
      .getByTestId("dashboard-delivery-risk-card")
      .getByRole("button", { name: /open delivery risk/i })
      .click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 15_000,
    });
    await expectPerformanceTab(page, /delivery risk/i);
  });

  test("cta-open-team-overview", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /team actions/i }).click();
    await page.getByRole("button", { name: /open team overview/i }).click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 15_000,
    });
    await expectPerformanceTab(page, /^overview$/i);
  });

  test("cta-view-person", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const rec = page.getByTestId("dashboard-recommendations");
    const viewPerson = rec.getByRole("button", { name: /view person/i }).first();
    if (!(await viewPerson.isVisible())) {
      test.skip();
    }
    await viewPerson.click();
    await expect(page.locator(".drawer--person-detail")).toBeVisible({ timeout: 15_000 });
  });

  test("team-attention-show-tasks", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await clickSubnav(page, /^overview$/i);
    const link = page
      .getByTestId("team-attention-row")
      .getByTestId("grouped-issue-count-link")
      .first();
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    await expect(page.getByTestId("task-list-modal")).toBeVisible();
  });

  test("people-show-tasks", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await clickSubnav(page, /^people$/i);
    await expect(page.getByTestId("team-people-view")).toBeVisible();
    const link = page.getByTestId("show-grouped-tasks").first();
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    await expect(page.getByTestId("task-list-modal")).toBeVisible();
  });

  test("radar-show-tasks", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await clickSubnav(page, /^radar$/i);
    await expect(page.getByTestId("team-radar-view")).toBeVisible();
    const link = page.getByTestId("show-grouped-tasks").first();
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    await expect(page.getByTestId("task-list-modal")).toBeVisible();
  });

  test("attention-signals-show-tasks", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await openFirstAttentionPerson(page);
    const table = page.getByTestId("attention-signals-table");
    await expect(table).toBeVisible();
    const link = table.getByTestId("show-grouped-tasks").first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page.getByTestId("task-list-modal")).toBeVisible();
    }
  });

  test("task-list-modal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await clickSubnav(page, /^overview$/i);
    const link = page
      .getByTestId("team-attention-row")
      .getByTestId("grouped-issue-count-link")
      .first();
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    const modal = page.getByTestId("task-list-modal");
    await expect(modal.getByRole("columnheader", { name: "Issue" })).toBeVisible();
    await expect(modal.getByRole("columnheader", { name: "Last status change" })).toBeVisible();
    await expect(modal).toHaveScreenshot("task-list-modal.png", SHOT);
  });

  test("table-header-nowrap", async ({ page }) => {
    await setViewport(page, 1280, 900);
    await bootMetrio(page);
    await assertTableHeadersNowrap(page, ".performance-table--team-workload");
    const workloadHeader = page.locator(".performance-table--team-workload thead");
    await expect(workloadHeader).toHaveScreenshot("team-workload-header-1280.png", SHOT);
    await clickSubnav(page, /delivery risk/i);
    await assertTableHeadersNowrap(page, ".performance-table--delivery-risk");
    await expect(page.locator(".performance-table--delivery-risk thead")).toContainText(
      "Risk reason",
    );
  });

  test("capacity-insufficient-production-path", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-visualCapacityInsufficientAll", "1");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^overview$/i);
    await expect(page.locator(".performance-table--team-workload tbody")).toContainText(
      "Not enough history",
    );
  });

  for (const width of [1280, 1440, 1728] as const) {
    test(`team-workload-columns-${width}`, async ({ page }) => {
      await setViewport(page, width, 900);
      await bootMetrio(page);
      const table = page.locator(".performance-table--team-workload");
      await expect(table).toBeVisible();
      await assertTableHeadersNowrap(page, ".performance-table--team-workload");
      await expect(table).toHaveScreenshot(`team-workload-columns-${width}.png`, SHOT);
    });
  }

  test("people-columns", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await clickSubnav(page, /^people$/i);
    const table = page.locator(".performance-table--people");
    await expect(table).toBeVisible();
    await assertTableHeadersNowrap(page, ".performance-table--people");
    await expect(table).toHaveScreenshot("people-columns-1440.png", SHOT);
  });

  test("radar-columns", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrioWithFlags(page, { groupedTasks: true });
    await clickSubnav(page, /^radar$/i);
    const table = page.locator(".performance-table--radar");
    await expect(table).toBeVisible();
    await assertTableHeadersNowrap(page, ".performance-table--radar");
    await expect(table).toHaveScreenshot("radar-columns-1440.png", SHOT);
  });

  test("delivery-risk-columns", async ({ page }) => {
    await setViewport(page, 1280, 900);
    await bootMetrio(page);
    await clickSubnav(page, /delivery risk/i);
    const table = page.locator(".performance-table--delivery-risk");
    await expect(table).toBeVisible();
    await assertTableHeadersNowrap(page, ".performance-table--delivery-risk");
    await expect(table).toHaveScreenshot("delivery-risk-columns-1280.png", SHOT);
  });

  test("person-drawer-top-actions", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    const toolbar = page.locator(".drawer--person-detail .drawer__header-toolbar");
    await expect(toolbar.getByRole("button", { name: /^brief$/i })).toBeVisible();
    await expect(toolbar).toHaveScreenshot("person-drawer-top-actions.png", SHOT);
  });

  test("person-to-brief-stack", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
    await page.getByRole("button", { name: /^brief$/i }).click();
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
    await expect(page.locator("[data-drawer-panel='secondary']")).toBeVisible();
    await page.getByRole("button", { name: /close brief/i }).click();
    await expect(page.locator("[data-drawer-panel='primary']")).toBeVisible();
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
  });

  test("person-current-recent-parity", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    await page.getByRole("button", { name: /^brief$/i }).click();
    await expect(page.locator("[data-drawer-panel='secondary']")).toBeVisible();
    await expect(page.getByRole("heading", { name: /current work/i })).toBeVisible();
    const current = page.locator(".person-brief__work-list").first();
    await expect(current).toHaveScreenshot("person-brief-current-work.png", SHOT);
  });

  test("person-scrollbar-shell", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    const body = page.locator(".drawer--person-detail .drawer__body");
    await expect(body).toHaveClass(/metrio-scroll--overlay/);
    await expect(body).toHaveScreenshot("person-scrollbar-shell.png", SHOT);
  });

  test("performance-date-input-idle", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    const toolbar = page.locator(".performance-toolbar");
    await expect(toolbar).toHaveScreenshot("performance-date-input-idle.png", SHOT);
  });

  test("performance-date-input-open", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await page.getByRole("button", { name: /^From date,/i }).click();
    await expect(page.locator(".metrio-date-picker__popover")).toBeVisible();
    await expect(page.locator(".performance-toolbar")).toHaveScreenshot(
      "performance-date-input-open.png",
      SHOT,
    );
  });

  test("performance-select-open", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    await page.getByRole("button", { name: /^brief$/i }).click();
    await page.getByLabel("Brief period").click();
    await expect(page.locator(".person-brief__period .select-trigger")).toHaveScreenshot(
      "performance-select-open.png",
      SHOT,
    );
  });
});

import { expect, test } from "@playwright/test";
import {
  bootDashboardManager,
  bootMetrio,
  clickSubnav,
  openFirstAttentionPerson,
  openPerformanceFromHome,
  setViewport,
} from "./visualBoot";

const SHOT = { maxDiffPixelRatio: 0.02 };

test.describe("UI Repair Pass 11 visual acceptance", () => {
  test("dashboard-refresh-width-stable", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const refresh = page.getByTestId("dashboard-executive-header").getByRole("button", {
      name: /^refresh$/i,
    });
    await expect(refresh).toHaveScreenshot("dashboard-refresh-idle.png", SHOT);
    await refresh.click();
    const refreshing = page.getByRole("button", { name: /refreshing/i });
    await expect(refreshing).toBeVisible();
    await expect(page.getByTestId("dashboard-executive-header")).toHaveScreenshot(
      "dashboard-refresh-active.png",
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

  test("dashboard-goal-reviews-flat", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const card = page.getByTestId("home-goals-summary");
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("dashboard-goal-reviews-flat.png", SHOT);
  });

  test("team-attention-show-tasks", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-visual-visualGroupedTasks", "1");
    });
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await clickSubnav(page, /^overview$/i);
    const preview = page.getByTestId("grouped-issue-preview").first();
    await expect(preview.getByTestId("show-grouped-tasks")).toBeVisible();
    await preview.getByTestId("show-grouped-tasks").click();
    await expect(page.getByTestId("task-list-modal")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("UX-2960");
  });

  test("people-show-tasks", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-visual-visualGroupedTasks", "1");
    });
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await clickSubnav(page, /^people$/i);
    await expect(page.getByTestId("team-people-view")).toBeVisible();
    const link = page.getByTestId("show-grouped-tasks").first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page.getByTestId("task-list-modal")).toBeVisible();
    }
  });

  test("task-list-modal", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-visual-visualGroupedTasks", "1");
    });
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await clickSubnav(page, /^overview$/i);
    await page.getByTestId("show-grouped-tasks").first().click();
    await expect(page.getByTestId("task-list-modal")).toHaveScreenshot(
      "task-list-modal.png",
      SHOT,
    );
  });

  test("table-header-nowrap", async ({ page }) => {
    await setViewport(page, 1280, 900);
    await bootMetrio(page);
    await clickSubnav(page, /^overview$/i);
    const workload = page.locator(".performance-table--team-workload thead");
    await expect(workload).toHaveScreenshot("team-workload-header-1280.png", SHOT);
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
    const table = page.locator(".performance-table--team-workload tbody");
    await expect(table).toContainText("Not enough history");
  });

  test("cta-open-goals", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.getByTestId("home-goals-summary").getByRole("button", { name: /open goals/i }).click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible();
    await expect(page.locator(".performance-subnav").getByRole("button", { name: /^goals$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("cta-open-delivery-risk", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page
      .getByTestId("dashboard-lower-three-cards")
      .getByRole("button", { name: /open delivery risk/i })
      .click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible();
    await expect(
      page.locator(".performance-subnav").getByRole("button", { name: /delivery risk/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("person-to-brief-stack", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
    await page.getByRole("button", { name: /^brief$/i }).click();
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
    await expect(page.locator("[data-drawer-panel='secondary']")).toBeVisible();
  });
});

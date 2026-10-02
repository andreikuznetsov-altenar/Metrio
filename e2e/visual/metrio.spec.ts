import { test, expect, type Page } from "@playwright/test";

async function bootMetrio(page: Page, fixture: "lead" | "employee" = "lead") {
  await page.addInitScript((fixtureId: string) => {
    localStorage.setItem("metrio-connection-connected", "true");
    localStorage.setItem("metrio-dev-fixture", fixtureId);
    localStorage.setItem("metrio-theme", "light");
  }, fixture);

  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
    timeout: 30_000,
  });
}

async function clickSubnav(page: Page, label: RegExp) {
  await page.getByRole("button", { name: label }).click();
  await page.waitForTimeout(150);
}

test.describe("Metrio visual regression", () => {
  test("team overview light", async ({ page }) => {
    await bootMetrio(page, "lead");
    await expect(page).toHaveScreenshot("team-overview-light.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance overview loading overlay", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");

    await page.goto("/?visualOverlay=1");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("performance-content-overlay")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveScreenshot("performance-overview-loading-overlay.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("team overview dark", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "dark");
    });
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveScreenshot("team-overview-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("people tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^people$/i);
    await expect(page).toHaveScreenshot("team-people.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("radar tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^radar$/i);
    await expect(page).toHaveScreenshot("team-radar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("delivery risk tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /delivery risk/i);
    await expect(page).toHaveScreenshot("team-delivery-risk.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.locator(".performance-attention-row").first().click();
    await expect(page.locator(".drawer")).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("employee overview", async ({ page }) => {
    await bootMetrio(page, "employee");
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveScreenshot("employee-overview.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback page", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await expect(page.getByRole("heading", { name: /feedback/i })).toBeVisible();
    await expect(page).toHaveScreenshot("feedback.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings nav inactive while settings open", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await expect(page.getByRole("button", { name: /^performance$/i })).not.toHaveClass(
      /is-active/,
    );
    await expect(page.getByRole("button", { name: /^feedback$/i })).not.toHaveClass(
      /is-active/,
    );
    await expect(page).toHaveScreenshot("settings-nav-inactive.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer overview grouped", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.locator(".performance-attention-row").first().click();
    await expect(page.locator(".drawer")).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer-overview.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer work tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.locator(".performance-attention-row").first().click();
    await page.locator(".drawer").getByRole("tab", { name: "Work" }).click();
    await expect(page).toHaveScreenshot("person-drawer-work.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer history tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.locator(".performance-attention-row").first().click();
    await page.locator(".drawer").getByRole("tab", { name: "History" }).click();
    await expect(page).toHaveScreenshot("person-drawer-history.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance overview initial skeleton", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");

    await page.goto("/?visualSkeleton=1");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("performance-overview-skeleton")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveScreenshot("performance-overview-skeleton.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance select open", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByLabel("Date range preset").click();
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot("performance-select-open.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance kpi help tooltip", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page
      .getByRole("button", {
        name: /Overall performance score based on completion/i,
      })
      .hover();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("performance-kpi-tooltip.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance people badges", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^people$/i);
    await expect(page).toHaveScreenshot("performance-people-badges.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance trend charts", async ({ page }) => {
    await bootMetrio(page, "lead");
    await expect(page.getByTestId("trend-mini-chart").first()).toBeVisible();
    await expect(page).toHaveScreenshot("performance-trend-charts.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance insufficient history card", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");

    await page.goto("/?visualInsufficientHistory=1");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("visual-insufficient-history-card")).toBeVisible();
    await expect(page).toHaveScreenshot("performance-insufficient-history.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("app header utilities", async ({ page }) => {
    await bootMetrio(page, "lead");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page).toHaveScreenshot("app-header-nav.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance date picker open", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^From date,/i }).click();
    await expect(page.locator(".metrio-date-picker__popover")).toBeVisible();
    await expect(page).toHaveScreenshot("performance-date-picker-from.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification sidebar", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem(
        "metrio-notification-events",
        JSON.stringify([
          {
            id: "n1",
            type: "task_attention",
            createdAt: new Date().toISOString(),
            title: "Task needs attention",
            message: "UX-5446 · Daria Chernowa",
            issueKey: "UX-5446",
            dedupeKey: "visual:1",
          },
          {
            id: "n2",
            type: "upcoming_time_off",
            createdAt: new Date(Date.now() - 720_000).toISOString(),
            title: "Upcoming time off",
            message: "Valeriia Pavlova · 12–18 Oct",
            readAt: new Date().toISOString(),
            dedupeKey: "visual:2",
          },
        ]),
      );
    });
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^notifications$/i }).click();
    await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
    await expect(page).toHaveScreenshot("notification-sidebar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings advanced", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await page.getByRole("button", { name: /^advanced$/i }).click();
    await expect(page).toHaveScreenshot("settings-advanced.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

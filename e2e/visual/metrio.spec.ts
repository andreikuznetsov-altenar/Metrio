import { test, expect, type Page } from "@playwright/test";
import { serializeNotificationFixtureForPlaywright } from "../../src/fixtures/notificationCenterVisualFixture";
import { serializeFeedbackVisualPrefsForPlaywright } from "../../src/fixtures/feedbackWorkflowFixture";

async function bootMetrioFeedback(page: Page, theme: "light" | "dark" = "light") {
  const prefsJson = serializeFeedbackVisualPrefsForPlaywright();
  await page.addInitScript(
    ({ fixtureId, themeId, prefs }: { fixtureId: string; themeId: string; prefs: string }) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", themeId);
      localStorage.setItem("metrio-visual-preferences", prefs);
    },
    { fixtureId: "lead", themeId: theme, prefs: prefsJson },
  );
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
    timeout: 30_000,
  });
}

async function bootMetrio(
  page: Page,
  fixture: "lead" | "employee" | "director" = "lead",
) {
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

async function bootMetrioWithNotificationFixture(
  page: Page,
  expectedUnread = 2,
) {
  const eventsJson = serializeNotificationFixtureForPlaywright();
  await page.addInitScript((payload: string) => {
    localStorage.setItem("metrio-connection-connected", "true");
    localStorage.setItem("metrio-dev-fixture", "lead");
    localStorage.setItem("metrio-theme", "light");
    localStorage.setItem("metrio-notification-events", payload);
  }, eventsJson);
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
    timeout: 30_000,
  });
  await page.evaluate((payload: string) => {
    localStorage.setItem("metrio-notification-events", payload);
    window.dispatchEvent(new CustomEvent("metrio-notification-events-changed"));
  }, eventsJson);
  const bellLabel =
    expectedUnread > 0
      ? new RegExp(`Notifications, ${expectedUnread} unread`, "i")
      : /^Notifications$/i;
  await expect(page.getByRole("button", { name: bellLabel })).toBeVisible({
    timeout: 15_000,
  });
}

async function clickSubnav(page: Page, label: RegExp) {
  await page
    .locator(".performance-subnav")
    .getByRole("button", { name: label })
    .click();
  await page.waitForTimeout(150);
}

async function openFirstAttentionPerson(page: Page) {
  const row = page.locator(".performance-table--attention tbody tr").first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
}

async function clickSettingsSection(page: Page, label: RegExp) {
  await page
    .locator('.settings-layout nav[aria-label="Settings sections"]')
    .getByRole("button", { name: label })
    .click();
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

  test("completed KPI analytics drawer", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Completed");
    await expect(page).toHaveScreenshot("analytics-completed-drawer.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("efficiency KPI analytics drawer", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Efficiency details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Efficiency");
    await expect(page).toHaveScreenshot("analytics-efficiency-drawer.png", {
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
      fullPage: false,
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
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer--person")).toBeVisible();
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

  test("employee my week", async ({ page }) => {
    await bootMetrio(page, "employee");
    await page.getByRole("button", { name: "My Week" }).click();
    await expect(page.getByLabel("My week summary")).toBeVisible();
    await expect(page).toHaveScreenshot("employee-my-week.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("employee trends", async ({ page }) => {
    await bootMetrio(page, "employee");
    await page.getByRole("button", { name: "Trends" }).click();
    await expect(page.getByLabel("Trends")).toBeVisible();
    await expect(page).toHaveScreenshot("employee-trends.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("employee work history", async ({ page }) => {
    await bootMetrio(page, "employee");
    await page.getByRole("button", { name: "Work History" }).click();
    await expect(page.getByLabel("Work history")).toBeVisible();
    await expect(page).toHaveScreenshot("employee-work-history.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("employee self drill-down", async ({ page }) => {
    await bootMetrio(page, "employee");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("employee-drilldown-completed.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("employee dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "employee");
    await page.goto("/");
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveScreenshot("employee-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback survey connected", async ({ page }) => {
    await bootMetrioFeedback(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await expect(page.locator(".feedback-google-strip")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".performance-subnav")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("feedback-survey-connected.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback dark theme", async ({ page }) => {
    await bootMetrioFeedback(page, "dark");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await expect(page.getByText("Google Workspace")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("feedback-dark.png", {
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
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer--person")).toBeVisible();
    await expect(page.locator(".person-detail-drawer__context")).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer-overview.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer work tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person").getByRole("tab", { name: "Work" }).click();
    await expect(page.locator(".person-detail-drawer__context")).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer-work.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer history tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person").getByRole("tab", { name: "History" }).click();
    await expect(page.locator(".person-detail-drawer__context")).toBeVisible();
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
    await bootMetrioWithNotificationFixture(page, 2);
    await page.getByRole("button", { name: /Notifications, 2 unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await expect(page).toHaveScreenshot("notification-sidebar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification workload opens person drawer", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      localStorage.setItem(
        "metrio-notification-events",
        JSON.stringify([
          {
            id: "e-workload",
            type: "workload_change",
            createdAt: new Date().toISOString(),
            title: "Workload changed",
            message: "Mia Chen is overloaded",
            personId: "person-01",
            personName: "Mia Chen",
            target: { kind: "person", personId: "person-01" },
            severity: "warning",
          },
        ]),
      );
      window.dispatchEvent(new CustomEvent("metrio-notification-events-changed"));
    });
    await page.getByRole("button", { name: /Notifications, 1 unread/i }).click();
    await page.getByRole("button", { name: /Workload changed/i }).click();
    await expect(page.locator(".drawer--notifications")).toHaveCount(0);
    await expect(page.locator(".person-detail-drawer__name")).toContainText("Mia");
  });

  test("notification task opens Jira issue", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      localStorage.setItem(
        "metrio-notification-events",
        JSON.stringify([
          {
            id: "e-task",
            type: "task_attention",
            createdAt: new Date().toISOString(),
            title: "Task needs attention",
            message: "UX-5446 · Alex Morgan",
            issueKey: "UX-5446",
            target: { kind: "jira", issueKey: "UX-5446" },
            severity: "warning",
          },
        ]),
      );
      window.dispatchEvent(new CustomEvent("metrio-notification-events-changed"));
    });
    await page.getByRole("button", { name: /Notifications, 1 unread/i }).click();
    await page.getByRole("button", { name: /Task needs attention/i }).click();
    const opened = await page.evaluate(
      () => (window as unknown as { __metrioLastOpenedUrl?: string }).__metrioLastOpenedUrl,
    );
    expect(opened).toContain("/browse/UX-5446");
  });

  test("notification clear history", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 2);
    await page.getByRole("button", { name: /Notifications, 2 unread/i }).click();
    await page.getByRole("button", { name: "Notification options" }).click();
    await page.getByRole("menuitem", { name: "Clear notifications" }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("No notifications yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Notifications$/i })).toBeVisible();
  });

  test("settings general theme picker", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await expect(page.getByRole("button", { name: /^general$/i })).toBeVisible();
    await expect(page).toHaveScreenshot("settings-general.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings connections credentials", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    await expect(page.getByText(/^Token$/i)).toBeVisible();
    await expect(page).toHaveScreenshot("settings-connections.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings notifications switches", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^notifications$/i);
    await expect(page.getByRole("switch", { name: /Vacation starting soon/i })).toBeVisible();
    await expect(page).toHaveScreenshot("settings-notifications.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings saved toast", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await page.getByRole("switch", { name: /Launch Metrio at login/i }).click();
    await expect(page.getByText("Settings saved")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".metrio-toast-host")).toHaveScreenshot("toast-settings-saved.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("drawer close keeps dialog during exit", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer-root.is-open")).toBeVisible();
    await page.locator(".drawer__header .icon-btn").click();
    await expect(page.locator(".drawer-root.is-visible:not(.is-open)")).toBeVisible();
    await expect(page.locator(".drawer-root.is-open")).toHaveCount(0);
  });

  test("director overview limited scope", async ({ page }) => {
    await bootMetrio(page, "director");
    await expect(page.getByTestId("director-overview")).toBeVisible();
    await expect(page).toHaveScreenshot("director-overview-limited.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("director teams view", async ({ page }) => {
    await bootMetrio(page, "director");
    await clickSubnav(page, /^teams$/i);
    await expect(page.getByTestId("director-teams")).toBeVisible();
    await expect(page).toHaveScreenshot("director-teams.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("director signals view", async ({ page }) => {
    await bootMetrio(page, "director");
    await clickSubnav(page, /^signals$/i);
    await expect(page.getByTestId("director-signals")).toBeVisible();
    await expect(page).toHaveScreenshot("director-signals.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("director delivery view", async ({ page }) => {
    await bootMetrio(page, "director");
    await clickSubnav(page, /^delivery$/i);
    await expect(page.getByTestId("director-delivery")).toBeVisible();
    await expect(page).toHaveScreenshot("director-delivery.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

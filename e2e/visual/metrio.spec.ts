import { test, expect, type Page } from "@playwright/test";
import { serializeNotificationFixtureForPlaywright } from "../../src/fixtures/notificationCenterVisualFixture";
import {
  serializeFeedbackDisconnectedPrefsForPlaywright,
  serializeFeedbackVisualPrefsForPlaywright,
} from "../../src/fixtures/feedbackWorkflowFixture";
import { serializeDigestVisualPrefsForPlaywright } from "../../src/fixtures/digestVisualFixture";
import { serializeGoalsVisualFixtureForPlaywright } from "../../src/fixtures/goalsVisualFixture";
import { serializeOnboardingChecklistVisualFixtureForPlaywright } from "../../src/fixtures/onboardingChecklistVisualFixture";
import {
  serializeCompanyConfigAdminEmailsForPlaywright,
  serializeCompanyConfigVisualFixtureForPlaywright,
} from "../../src/fixtures/companyConfigVisualFixture";
import { serializeCalendarVisualFixtureForPlaywright } from "../../src/fixtures/calendarVisualFixture";

async function bootMetrioFeedbackDisconnected(
  page: Page,
  theme: "light" | "dark" = "light",
) {
  const prefsJson = serializeFeedbackDisconnectedPrefsForPlaywright();
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
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
}

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
  await openPerformanceFromHome(page);
}

async function openPerformanceFromHome(page: Page) {
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  await page.locator(".app-header__nav-link").filter({ hasText: "Performance" }).click();
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
  await openPerformanceFromHome(page);
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
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
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
    await openPerformanceFromHome(page);
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
    await openPerformanceFromHome(page);
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
    await expect(page.locator(".drawer--person-detail")).toBeVisible();
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
    await openPerformanceFromHome(page);
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
    await expect(
      page.locator(".app-header__nav-link").filter({ hasText: "Performance" }),
    ).not.toHaveClass(/is-active/);
    const feedbackNav = page
      .locator(".app-header__nav-link")
      .filter({ hasText: "Feedback" });
    if ((await feedbackNav.count()) > 0) {
      await expect(feedbackNav).not.toHaveClass(/is-active/);
    }
    await expect(page).toHaveScreenshot("settings-nav-inactive.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer overview grouped", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer--person-detail")).toBeVisible();
    await expect(page.locator(".person-detail-drawer__context")).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer-overview.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer work tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person-detail").getByRole("tab", { name: "Work" }).click();
    await expect(page.locator(".person-detail-drawer__context")).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer-work.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer history tab", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person-detail").getByRole("tab", { name: "History" }).click();
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
    await page.locator(".app-header__nav-link").filter({ hasText: "Performance" }).click();
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
    await openPerformanceFromHome(page);
    await expect(page.getByTestId("visual-insufficient-history-card")).toBeVisible();
    await expect(page).toHaveScreenshot("performance-insufficient-history.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("app header utilities", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
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

  async function bootDigestVisual(
    page: Page,
    variant: "employee" | "manager" | "weekly" | "no-change",
    fixture: "employee" | "lead" = "employee",
    theme: "light" | "dark" = "light",
  ) {
    const prefsJson = serializeDigestVisualPrefsForPlaywright(variant);
    await page.addInitScript(
      ({ fixtureId, themeId, prefs }: { fixtureId: string; themeId: string; prefs: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", themeId);
        localStorage.setItem("metrio-visual-preferences", prefs);
      },
      { fixtureId: fixture, themeId: theme, prefs: prefsJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  }

  async function openDigestDrawer(page: Page, digestKind: "daily" | "weekly") {
    await page.evaluate((kind) => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-digest", { detail: { digestKind: kind } }),
      );
    }, digestKind);
    await expect(page.getByTestId("digest-drawer")).toBeVisible({ timeout: 10_000 });
  }

  test("employee daily brief drawer", async ({ page }) => {
    await bootDigestVisual(page, "employee", "employee", "light");
    await openDigestDrawer(page, "daily");
    await expect(page).toHaveScreenshot("employee-daily-brief.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("manager daily brief drawer", async ({ page }) => {
    await bootDigestVisual(page, "manager", "lead", "light");
    await openDigestDrawer(page, "daily");
    await expect(page).toHaveScreenshot("manager-daily-brief.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("weekly digest drawer", async ({ page }) => {
    await bootDigestVisual(page, "weekly", "lead", "light");
    await openDigestDrawer(page, "weekly");
    await expect(page).toHaveScreenshot("weekly-digest.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("no-change daily brief drawer", async ({ page }) => {
    await bootDigestVisual(page, "no-change", "employee", "light");
    await openDigestDrawer(page, "daily");
    await expect(page).toHaveScreenshot("digest-no-change.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("employee daily brief drawer dark mode", async ({ page }) => {
    await bootDigestVisual(page, "employee", "employee", "dark");
    await openDigestDrawer(page, "daily");
    await expect(page).toHaveScreenshot("employee-daily-brief-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  async function bootGoalsVisual(
    page: Page,
    fixture: "employee" | "lead",
    theme: "light" | "dark" = "light",
  ) {
    const goalsJson = serializeGoalsVisualFixtureForPlaywright();
    await page.addInitScript(
      ({ fixtureId, themeId, goals }: { fixtureId: string; themeId: string; goals: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", themeId);
        localStorage.setItem("metrio-visual-goals", goals);
      },
      { fixtureId: fixture, themeId: theme, goals: goalsJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.locator(".app-header__nav-link").filter({ hasText: "Performance" }).click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await page
      .locator(".performance-subnav")
      .getByRole("button", { name: /^Goals$/i })
      .click();
  }

  test("employee goals view", async ({ page }) => {
    await bootGoalsVisual(page, "employee", "light");
    await expect(page.getByTestId("employee-goals")).toBeVisible();
    await expect(page).toHaveScreenshot("employee-goals.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("manager goals view", async ({ page }) => {
    await bootGoalsVisual(page, "lead", "light");
    await expect(page.getByTestId("manager-goals")).toBeVisible();
    await expect(page).toHaveScreenshot("manager-goals.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("employee goals dark mode", async ({ page }) => {
    await bootGoalsVisual(page, "employee", "dark");
    await expect(page.getByTestId("employee-goals")).toBeVisible();
    await expect(page).toHaveScreenshot("employee-goals-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback cycles tab", async ({ page }) => {
    await bootMetrioFeedback(page, "light");
    await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycles")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("feedback-cycles.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback cycles dark mode", async ({ page }) => {
    await bootMetrioFeedback(page, "dark");
    await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycles")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("feedback-cycles-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  async function openFeedbackDisconnectedState(page: Page) {
    await bootMetrioFeedbackDisconnected(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await expect(page.getByTestId("feedback-survey-disconnected")).toBeVisible({
      timeout: 15_000,
    });
  }

  test("feedback survey disconnected", async ({ page }) => {
    test.setTimeout(60_000);
    await openFeedbackDisconnectedState(page);
    await expect(page).toHaveScreenshot("feedback-disconnected.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback disconnected dark", async ({ page }) => {
    test.setTimeout(60_000);
    await bootMetrioFeedbackDisconnected(page, "dark");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await expect(page.getByTestId("feedback-survey-disconnected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveScreenshot("feedback-disconnected-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback google setup instructions", async ({ page }) => {
    test.setTimeout(60_000);
    await openFeedbackDisconnectedState(page);
    await page.getByRole("button", { name: "Setup instructions" }).click();
    await expect(page.getByTestId("feedback-google-setup-instructions")).toBeVisible();
    await expect(page).toHaveScreenshot("feedback-instructions.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback google apps script advanced", async ({ page }) => {
    test.setTimeout(60_000);
    await openFeedbackDisconnectedState(page);
    await page.getByRole("button", { name: "Setup instructions" }).click();
    await page.getByRole("button", { name: "Apps Script setup" }).click();
    await expect(page.getByTestId("google-apps-script-setup")).toBeVisible();
    await expect(page).toHaveScreenshot("feedback-apps-script-advanced.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  async function openAttentionRulesSettings(page: Page) {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await clickSettingsSection(page, /attention rules/i);
    await expect(page.getByTestId("operational-rules-settings")).toBeVisible();
  }

  test("operational rules settings", async ({ page }) => {
    await openAttentionRulesSettings(page);
    await expect(page).toHaveScreenshot("operational-rules-settings.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("attention rules settings 1280", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAttentionRulesSettings(page);
    const grid = page.getByTestId("attention-rules-field-grid");
    await expect(grid).toBeVisible();
    await expect(grid).toHaveScreenshot("attention-rules-1280.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("attention rules settings 1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openAttentionRulesSettings(page);
    const grid = page.getByTestId("attention-rules-field-grid");
    await expect(grid).toHaveScreenshot("attention-rules-1440.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("project cockpit drawer", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-project-cockpit", {
          detail: { projectKey: "UX" },
        }),
      );
    });
    await expect(page.getByTestId("project-cockpit")).toBeVisible();
    await expect(page).toHaveScreenshot("project-cockpit-overview.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("project cockpit dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-project-cockpit", {
          detail: { projectKey: "UX" },
        }),
      );
    });
    await expect(page.getByTestId("project-cockpit")).toBeVisible();
    await expect(page).toHaveScreenshot("project-cockpit-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person brief drawer", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.getByRole("button", { name: "Brief" }).click();
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    await expect(page.locator(".drawer--person-detail")).toHaveCount(0);
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
    await expect(page).toHaveScreenshot("person-brief-standard.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person brief from person flow single backdrop", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer--person-detail")).toHaveCount(1);
    await page.getByRole("button", { name: "Brief" }).click();
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    await expect(page.locator(".drawer--person-detail")).toHaveCount(0);
    await expect(page.locator(".drawer-root__backdrop")).toHaveCount(1);
    await expect(page).toHaveScreenshot("person-brief-from-person.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person work dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person-detail").getByRole("tab", { name: "Work" }).click();
    await expect(page.getByTestId("person-work-card").first()).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer-work-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person history dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person-detail").getByRole("tab", { name: "History" }).click();
    await expect(page.getByLabel("History period")).toBeVisible();
    await expect(page).toHaveScreenshot("person-drawer-history-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person brief dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-person-brief", {
          detail: { personId: "person-01" },
        }),
      );
    });
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    await expect(page).toHaveScreenshot("person-brief-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer overloaded workload", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-person", { detail: "person-01" }),
      );
    });
    await expect(page.getByTestId("person-workload-badge")).toHaveText("Overloaded");
    await expect(page).toHaveScreenshot("person-drawer-overloaded.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person drawer balanced workload", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-person", { detail: "person-sam" }),
      );
    });
    await expect(page.getByTestId("person-workload-badge")).toHaveText("Balanced");
    await expect(page).toHaveScreenshot("person-drawer-balanced.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("search open", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("search-open.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("command palette search issue", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.keyboard.press("Meta+k");
    await page.getByRole("textbox", { name: "Quick find" }).fill("UX-");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("command-palette-search-issue.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("search dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("search-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification sidebar", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await expect(page).toHaveScreenshot("notification-sidebar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications header close-up", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    const header = page.locator(".drawer--notifications .drawer__header");
    await expect(header).toBeVisible();
    await expect(header).toHaveScreenshot("notifications-header-closeup.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications source tabs", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    const filters = page.locator(".notification-center__filters");
    await expect(filters).toBeVisible();
    await expect(filters).toHaveScreenshot("notifications-source-tabs.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications jira task cta", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    const card = page
      .locator(".drawer--notifications")
      .getByTestId("notification-card")
      .filter({ hasText: "Task needs attention" })
      .first();
    await expect(card.getByRole("button", { name: "Open Jira" })).toBeVisible();
    await expect(card).toHaveScreenshot("notifications-jira-task-cta.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications dense list", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    const list = page.locator(".drawer--notifications .notification-center__list").first();
    await expect(list).toBeVisible();
    await expect(list).toHaveScreenshot("notifications-dense-list.png", {
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
    await page
      .locator(".drawer--notifications")
      .getByRole("button", { name: "View person" })
      .click();
    await expect(page.locator(".drawer--notifications")).toHaveCount(0);
    await expect(page.locator(".person-identity-header__name")).toContainText("Mia");
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
    await page.getByRole("button", { name: "Open Jira" }).click();
    const opened = await page.evaluate(
      () => (window as unknown as { __metrioLastOpenedUrl?: string }).__metrioLastOpenedUrl,
    );
    expect(opened).toContain("/browse/UX-5446");
  });

  test("notifications mixed read unread", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await expect(page).toHaveScreenshot("notifications-mixed-read-unread.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications jira source", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await page
      .locator(".drawer--notifications")
      .getByRole("button", { name: "Jira", exact: true })
      .click();
    await expect(page).toHaveScreenshot("notifications-jira.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications bamboo source", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await page
      .locator(".drawer--notifications .segmented-control__option")
      .filter({ hasText: "Bamboo" })
      .click();
    await expect(page).toHaveScreenshot("notifications-bamboohr.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications feedback source", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await page
      .locator(".drawer--notifications")
      .getByRole("button", { name: "Feedback", exact: true })
      .click();
    await expect(page).toHaveScreenshot("notifications-feedback.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notifications metrio source", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await page
      .locator(".drawer--notifications")
      .getByRole("button", { name: "Metrio", exact: true })
      .click();
    await expect(page).toHaveScreenshot("notifications-metrio.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("bell badge centered", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    const badge = page.locator(".app-header__bell-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS("display", "flex");
    await expect(badge).toHaveCSS("align-items", "center");
    await expect(badge).toHaveCSS("justify-content", "center");
    await expect(page.locator(".app-header__bell-wrap")).toHaveScreenshot("bell-badge.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification sidebar dark", async ({ page }) => {
    const eventsJson = serializeNotificationFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "dark");
      localStorage.setItem("metrio-notification-events", payload);
    }, eventsJson);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await expect(page).toHaveScreenshot("notifications-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification clear history", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    const notificationsDrawer = page.locator(".drawer--notifications");
    await notificationsDrawer.getByRole("button", { name: "Notification options" }).click();
    await notificationsDrawer.getByRole("menuitem", { name: "Clear all" }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("No notifications yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Notifications$/i })).toBeVisible();
  });

  test("profile menu theme", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.locator(".profile-menu__avatar").click();
    await expect(page.getByTestId("profile-menu-theme")).toBeVisible();
    await expect(page).toHaveScreenshot("profile-menu-theme.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings preferences section", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await expect(page.getByRole("button", { name: /^preferences$/i })).toBeVisible();
    await expect(page.getByTestId("preferences-settings")).toBeVisible();
    await expect(page.getByLabel("Theme preference")).toHaveCount(0);
    await expect(page).toHaveScreenshot("settings-preferences.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings connections credentials", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    await expect(page.getByText(/^API token$/i)).toBeVisible();
    await expect(page).toHaveScreenshot("settings-connections.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("connections jira card", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    const card = page.getByTestId("settings-jira-card");
    await expect(card.getByTestId("jira-get-api-token")).toBeVisible();
    await expect(card).toHaveScreenshot("connections-jira-card.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("connections bamboo card", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    const card = page.getByTestId("settings-bamboo-card");
    await expect(card.getByTestId("bamboo-api-key-help")).toBeVisible();
    await expect(card).toHaveScreenshot("connections-bamboo-card.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings preferences notifications card", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await expect(page.getByRole("switch", { name: /Vacation starting soon/i })).toBeVisible();
    await expect(page).toHaveScreenshot("settings-notifications.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings diagnostics healthy", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("diagnostics-settings")).toBeVisible();
    await expect(page.getByTestId("diagnostics-checks")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("diagnostics-settings")).toHaveScreenshot(
      "diagnostics-summary.png",
      { maxDiffPixelRatio: 0.02 },
    );
    await expect(page).toHaveScreenshot("settings-diagnostics.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("diagnostics advanced collapsed", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("diagnostics-checks")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("diagnostics-advanced")).toHaveCount(0);
    await expect(page.getByTestId("diagnostics-settings")).toHaveScreenshot(
      "diagnostics-advanced-collapsed.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("diagnostics dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("diagnostics-checks")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("diagnostics-settings")).toHaveScreenshot(
      "diagnostics-dark.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("settings diagnostics advanced dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await page.getByRole("button", { name: /Show advanced details/i }).click();
    await expect(page.getByTestId("diagnostics-advanced")).toBeVisible();
    await expect(page).toHaveScreenshot("settings-diagnostics-advanced-dark.png", {
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

  test("settings company and app", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("company-app-settings")).toBeVisible();
    await expect(page).toHaveScreenshot("settings-company-app.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await page.getByRole("button", { name: /^settings$/i }).click();
    await expect(page.getByTestId("preferences-settings")).toBeVisible();
    await expect(page).toHaveScreenshot("settings-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings connections dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    await expect(page.getByTestId("connections-settings")).toBeVisible();
    await expect(page).toHaveScreenshot("settings-connections-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("settings toggle close-up", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    const toggle = page.getByRole("switch", { name: /Launch Metrio at login/i });
    await expect(toggle).toHaveScreenshot("settings-toggle-off.png", {
      maxDiffPixelRatio: 0.02,
    });
    await toggle.click();
    await expect(toggle).toHaveScreenshot("settings-toggle-on.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("google apps script setup drawer", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    const connectGoogle = page.getByRole("button", { name: /^connect google$/i });
    if ((await connectGoogle.count()) > 0) {
      await connectGoogle.click();
      await expect(page.getByTestId("google-apps-script-setup")).toBeVisible();
      await expect(page).toHaveScreenshot("google-apps-script-setup.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    }
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

  test("employee home", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "employee");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("home-employee.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("manager home", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("home-manager.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("resource library from home", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Open resource library", exact: true }).click();
    await expect(page.getByTestId("resource-library")).toBeVisible();
    await expect(page).toHaveScreenshot("home-resource-library.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("home dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("home-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("onboarding checklist new starter", async ({ page }) => {
    const onboardingJson = serializeOnboardingChecklistVisualFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "employee");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-onboarding-checklist", payload);
    }, onboardingJson);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("onboarding-checklist-card")).toBeVisible();
    await expect(page).toHaveScreenshot("onboarding-checklist-home.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
    await page.getByRole("button", { name: "View checklist" }).click();
    await expect(page.getByTestId("onboarding-checklist-drawer")).toBeVisible();
    await expect(page).toHaveScreenshot("onboarding-checklist-drawer.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("company settings admin", async ({ page }) => {
    const cacheJson = serializeCompanyConfigVisualFixtureForPlaywright();
    const adminEmails = serializeCompanyConfigAdminEmailsForPlaywright();
    const prefsJson = serializeFeedbackVisualPrefsForPlaywright();
    await page.addInitScript(
      ({ cache, admins, prefs }: { cache: string; admins: string; prefs: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-company-config", cache);
        localStorage.setItem("metrio-company-config-dev-admin-emails", admins);
        const parsed = JSON.parse(prefs) as { workEmail?: string };
        parsed.workEmail = "person-sam@visual.metrio";
        localStorage.setItem("metrio-visual-preferences", JSON.stringify(parsed));
      },
      { cache: cacheJson, admins: adminEmails, prefs: prefsJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("company-config-admin")).toBeVisible();
    await expect(page).toHaveScreenshot("company-settings-admin.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("home manager calendar 1:1", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-03T09:30:00+02:00") });
    const calendarJson = serializeCalendarVisualFixtureForPlaywright();
    const prefsJson = serializeFeedbackVisualPrefsForPlaywright();
    await page.addInitScript(
      ({ payload, prefs }: { payload: string; prefs: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-calendar-visual-fixture", payload);
        const parsed = JSON.parse(prefs) as {
          google: Record<string, unknown>;
        };
        parsed.google = { ...parsed.google, calendarConnected: true };
        localStorage.setItem("metrio-visual-preferences", JSON.stringify(parsed));
      },
      { payload: calendarJson, prefs: prefsJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("home-upcoming-meetings")).toBeVisible();
    await expect(page.getByText("Team Weekly")).toBeVisible();
    await expect(page).toHaveScreenshot("home-manager-calendar-1-1.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("home blocked visual state", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/?visualHomeState=blocked");
    await expect(page.getByTestId("dashboard-blocked")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-blocked.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("home partial data visual state", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/?visualHomeState=partial");
    await expect(page.getByTestId("dashboard-partial")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-partial.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("home relevant knowledge resource rows", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "employee");
    await page.goto("/?visualHomeKnowledge=1");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("home-relevant-knowledge")).toBeVisible();
    await expect(page.getByText("UX Team Handbook")).toBeVisible();
    await expect(page).toHaveScreenshot("home-relevant-knowledge.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance toolbar at 1440", async ({ page }) => {
    await bootMetrio(page, "lead");
    await expect(page.locator(".performance-toolbar")).toBeVisible();
    await expect(page.locator(".performance-toolbar")).toHaveScreenshot(
      "performance-toolbar-1440.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("performance toolbar at 1728", async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 900 });
    await bootMetrio(page, "lead");
    await expect(page.locator(".performance-toolbar")).toBeVisible();
    await expect(page.locator(".performance-toolbar")).toHaveScreenshot(
      "performance-toolbar-1728.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("performance kpi without period comparison", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/?visualKpiNoComparison=1");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await openPerformanceFromHome(page);
    await expect(page.getByTestId("visual-kpi-no-comparison")).toBeVisible();
    await expect(page).toHaveScreenshot("performance-kpi-no-comparison.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("jira open external tooltip", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /delivery risk/i);
    const jiraAction = page.getByRole("button", { name: "Open Jira" }).first();
    await expect(jiraAction).toBeVisible({ timeout: 15_000 });
    await jiraAction.hover();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("jira-open-tooltip.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("resource library dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Open resource library", exact: true }).click();
    await expect(page.getByTestId("resource-library")).toBeVisible();
    await expect(page).toHaveScreenshot("home-resource-library-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  async function bootDashboardManager(page: Page, width?: number) {
    if (width) {
      await page.setViewportSize({ width, height: 900 });
    }
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  }

  test("dashboard team actions 1280", async ({ page }) => {
    await bootDashboardManager(page, 1280);
    const teamActions = page.getByRole("region", { name: "Team actions" });
    await expect(teamActions).toBeVisible();
    await expect(teamActions).toHaveScreenshot("dashboard-team-actions-1280.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard team actions 1440", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const teamActions = page.getByRole("region", { name: "Team actions" });
    await expect(teamActions).toHaveScreenshot("dashboard-team-actions-1440.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard team actions 1728", async ({ page }) => {
    await bootDashboardManager(page, 1728);
    const teamActions = page.getByRole("region", { name: "Team actions" });
    await expect(teamActions).toHaveScreenshot("dashboard-team-actions-1728.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("goal reviews dashboard card", async ({ page }) => {
    const goalsJson = serializeGoalsVisualFixtureForPlaywright();
    await page.addInitScript(
      ({ fixtureId, goals }: { fixtureId: string; goals: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-goals", goals);
      },
      { fixtureId: "lead", goals: goalsJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const card = page.getByTestId("home-goals-summary");
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("goal-reviews-dashboard-card.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard manager 1440", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-manager-1440.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard manager 1728", async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 900 });
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-manager-1728.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("delivery risk table 1440", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /delivery risk/i);
    await expect(page.getByTestId("delivery-risk-view")).toBeVisible();
    await expect(page).toHaveScreenshot("delivery-risk-1440.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("goals populated manager", async ({ page }) => {
    await bootGoalsVisual(page, "lead", "light");
    await expect(page.getByTestId("goals-list")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("goals-populated.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("goals empty manager", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-goals", "[]");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^goals$/i);
    await expect(page.getByTestId("goals-empty-state")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("goals-empty.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("goal drawer", async ({ page }) => {
    await bootGoalsVisual(page, "lead", "light");
    await page.getByTestId("goal-list-row").first().getByRole("button", { name: "Open goal" }).click();
    await expect(page.getByTestId("goal-detail-drawer")).toBeVisible();
    await expect(page).toHaveScreenshot("goal-drawer.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification badge unread", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await expect(page.getByTestId("notification-unread-badge")).toHaveText("6");
    await expect(page.locator(".app-header")).toHaveScreenshot("notification-badge-single.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("bell badge four", async ({ page }) => {
    const eventsJson = serializeNotificationFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      const parsed = JSON.parse(payload) as Array<Record<string, unknown>>;
      const fourUnread = parsed.slice(0, 4).map((event, index) => ({
        ...event,
        id: `visual-unread-4-${index}`,
        readAt: undefined,
        dedupeKey: `visual-unread-4-${index}`,
      }));
      localStorage.setItem("metrio-notification-events", JSON.stringify(fourUnread));
    }, eventsJson);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("notification-unread-badge")).toHaveText("4");
    const bell = page.locator(".app-header__bell-wrap");
    await expect(bell).toHaveScreenshot("bell-badge-4.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification badge nine plus", async ({ page }) => {
    const eventsJson = serializeNotificationFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      const parsed = JSON.parse(payload) as Array<Record<string, unknown>>;
      const expanded = Array.from({ length: 12 }, (_, index) => ({
        ...parsed[0],
        id: `visual-unread-${index}`,
        readAt: undefined,
        dedupeKey: `visual-unread-${index}`,
      }));
      localStorage.setItem("metrio-notification-events", JSON.stringify(expanded));
    }, eventsJson);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("notification-unread-badge")).toHaveText("9+");
    await expect(page.locator(".app-header")).toHaveScreenshot("notification-badge-9plus.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("onboarding checklist dark", async ({ page }) => {
    const onboardingJson = serializeOnboardingChecklistVisualFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "employee");
      localStorage.setItem("metrio-theme", "dark");
      localStorage.setItem("metrio-visual-onboarding-checklist", payload);
    }, onboardingJson);
    await page.goto("/");
    await expect(page.getByTestId("onboarding-checklist-card")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveScreenshot("onboarding-checklist-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

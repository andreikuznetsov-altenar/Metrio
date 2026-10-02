import { test, expect, type Page } from "@playwright/test";
import { serializeNotificationFixtureForPlaywright } from "../../src/fixtures/notificationCenterVisualFixture";
import { serializeFeedbackVisualPrefsForPlaywright } from "../../src/fixtures/feedbackWorkflowFixture";
import { serializeDigestVisualPrefsForPlaywright } from "../../src/fixtures/digestVisualFixture";
import { serializeGoalsVisualFixtureForPlaywright } from "../../src/fixtures/goalsVisualFixture";
import { serializeOnboardingChecklistVisualFixtureForPlaywright } from "../../src/fixtures/onboardingChecklistVisualFixture";
import {
  serializeCompanyConfigAdminEmailsForPlaywright,
  serializeCompanyConfigVisualFixtureForPlaywright,
} from "../../src/fixtures/companyConfigVisualFixture";

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
  await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Performance" }).click();
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
  await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
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
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
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
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
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
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Performance" }).click();
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
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycles")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("feedback-cycles.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback cycles dark mode", async ({ page }) => {
    await bootMetrioFeedback(page, "dark");
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycles")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("feedback-cycles-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("operational rules settings", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await page
      .locator(".page-subnav")
      .getByRole("button", { name: /attention rules/i })
      .click();
    await expect(page.getByTestId("operational-rules-settings")).toBeVisible();
    await expect(page).toHaveScreenshot("operational-rules-settings.png", {
      fullPage: true,
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
    await clickSubnav(page, /^people$/i);
    await page.locator(".performance-table--people tbody tr").first().click();
    await page.getByRole("button", { name: "Brief" }).click();
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    await expect(page).toHaveScreenshot("person-brief-standard.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("command palette empty", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("command-palette-empty.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("command palette search issue", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.keyboard.press("Meta+k");
    await page.getByLabel("Quick find").fill("UX-");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("command-palette-search-issue.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("command palette dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("command-palette-dark.png", {
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

  test("notification inbox unread filter", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await page.getByRole("button", { name: "Unread" }).click();
    await expect(page).toHaveScreenshot("notification-inbox-unread.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification inbox actions filter", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await page.getByRole("button", { name: "Actions" }).click();
    await expect(page).toHaveScreenshot("notification-inbox-actions.png", {
      fullPage: true,
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
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await expect(page).toHaveScreenshot("notification-sidebar-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("notification clear history", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
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

  test("employee home", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "employee");
    await page.goto("/");
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
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
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
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
    }, "employee");
    await page.goto("/");
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /Open resource library/i }).click();
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
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
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
    await expect(page.getByTestId("home-ready")).toBeVisible({ timeout: 30_000 });
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
    await page.addInitScript(
      ({ cache, admins }: { cache: string; admins: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-company-config", cache);
        localStorage.setItem("metrio-company-config-dev-admin-emails", admins);
      },
      { cache: cacheJson, admins: adminEmails },
    );
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Company" }).click();
    await expect(page.getByTestId("company-config-admin")).toBeVisible();
    await expect(page).toHaveScreenshot("company-settings-admin.png", {
      fullPage: true,
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

import { test, expect, type Page } from "@playwright/test";
import { serializeNotificationFixtureForPlaywright } from "../../src/fixtures/notificationCenterVisualFixture";
import {
  serializeFeedbackCyclesPopulatedSurveyForPlaywright,
  serializeFeedbackDeliveryVisualSurveyForPlaywright,
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
import { serializeDashboardCacheVisualFixtureForPlaywright } from "../../src/fixtures/dashboardCacheVisualFixture";
import {
  openResourceLibrary,
  VISUAL_EPHEMERAL_STORAGE_KEYS,
} from "./visualBoot";

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
  await page.addInitScript(
    ({ fixtureId, ephemeralKeys }: { fixtureId: string; ephemeralKeys: string[] }) => {
      for (const key of ephemeralKeys) {
        localStorage.removeItem(key);
      }
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    },
    { fixtureId: fixture, ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS] },
  );

  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
  await openPerformanceFromHome(page);
}

async function bootConnected(
  page: Page,
  fixture: "lead" | "employee" | "director",
  theme: "light" | "dark" = "light",
) {
  await page.addInitScript(
    ({
      fixtureId,
      themeId,
      ephemeralKeys,
    }: {
      fixtureId: string;
      themeId: string;
      ephemeralKeys: string[];
    }) => {
      for (const key of ephemeralKeys) {
        localStorage.removeItem(key);
      }
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", themeId);
    },
    { fixtureId: fixture, themeId: theme, ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS] },
  );
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
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

async function gotoSwitchVisualFixture(page: Page, theme: "light" | "dark" = "light") {
  await page.addInitScript((themeId: string) => {
    localStorage.setItem("metrio-theme", themeId);
  }, theme);
  await page.goto("/#switch-visual");
  await expect(page.getByTestId("switch-visual-fixture")).toBeVisible({ timeout: 15_000 });
}

function expectWithinTolerance(actual: number, expected: number, tolerance = 0.5) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

async function assertSwitchGeometry(
  page: Page,
  testId: string,
  position: "unchecked" | "checked",
) {
  const track = page.getByTestId(testId);
  const thumb = track.locator(".metrio-switch__thumb");
  const trackBox = await track.boundingBox();
  const thumbBox = await thumb.boundingBox();
  expect(trackBox).not.toBeNull();
  expect(thumbBox).not.toBeNull();
  if (!trackBox || !thumbBox) return;
  expectWithinTolerance(trackBox.width, 36);
  expectWithinTolerance(trackBox.height, 20);
  expectWithinTolerance(thumbBox.width, 16);
  expectWithinTolerance(thumbBox.height, 16);
  expectWithinTolerance(thumbBox.y - trackBox.y, 2);
  const bottomInset = trackBox.y + trackBox.height - (thumbBox.y + thumbBox.height);
  expectWithinTolerance(bottomInset, 2);
  if (position === "checked") {
    const rightInset = trackBox.x + trackBox.width - (thumbBox.x + thumbBox.width);
    expectWithinTolerance(rightInset, 2);
  } else {
    expectWithinTolerance(thumbBox.x - trackBox.x, 2);
  }
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
    await page.getByRole("button", { name: /Person/i }).click();
    await expect(page.locator(".performance-table-wrap").first()).toHaveScreenshot(
      "performance-people-sorted.png",
      { maxDiffPixelRatio: 0.02 },
    );
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

  test("performance-date-picker-24px", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^From date,/i }).click();
    await expect(page.locator(".metrio-date-picker__popover")).toBeVisible();
    await expect(page).toHaveScreenshot("performance-date-picker-24px.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance-select-4px-gap", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByLabel("Date range preset").click();
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot("performance-select-4px-gap.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person-header-actions", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    const toolbar = page.locator(".drawer--person-detail .drawer__header-toolbar");
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveScreenshot("person-header-actions.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("attention-signals-table", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await expect(page.getByTestId("attention-signals-table")).toBeVisible();
    await expect(page.getByTestId("attention-signals-table")).toHaveScreenshot(
      "attention-signals-table.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("trend-tooltip-clickable", async ({ page }) => {
    await bootMetrio(page, "lead");
    const chart = page.getByTestId("trend-mini-chart").first();
    await chart.hover({ position: { x: 48, y: 24 } });
    await expect(page.locator(".trend-chart-tooltip")).toBeVisible();
    await expect(chart).toHaveScreenshot("trend-tooltip-clickable.png", {
      maxDiffPixelRatio: 0.03,
    });
  });

  test("analytics-backflows-zero", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Backflows details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("analytics-backflows-zero.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("analytics-completed", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("analytics-completed.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("analytics-backflows-zero-dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await page.getByRole("button", { name: /View Backflows details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot("analytics-backflows-zero-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance-subnav", async ({ page }) => {
    await bootMetrio(page, "lead");
    const subnav = page.locator(".performance-subnav");
    await expect(subnav).toBeVisible({ timeout: 15_000 });
    await expect(subnav).toHaveScreenshot("performance-subnav.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("delivery-risk-short-row", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /delivery risk/i);
    const table = page.locator(".performance-table--delivery-risk");
    await expect(table).toBeVisible();
    const row = table.locator("tbody tr").first();
    await expect(row).toHaveScreenshot("delivery-risk-short-row.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("delivery-risk-multiline-row", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /delivery risk/i);
    const table = page.locator(".performance-table--delivery-risk");
    await expect(table).toBeVisible();
    const multiline = table.locator("tbody tr").filter({
      has: page.locator(".performance-table__clamp"),
    }).first();
    await expect(multiline).toBeVisible();
    await expect(multiline).toHaveScreenshot("delivery-risk-multiline-row.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("delivery-risk-sorted", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /delivery risk/i);
    const table = page.locator(".performance-table--delivery-risk");
    await expect(table).toBeVisible();
    await table.getByRole("button", { name: /^Age$/i }).click();
    await table.getByRole("button", { name: /^Age$/i }).click();
    await expect(table).toHaveScreenshot("delivery-risk-sorted.png", {
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
    await page.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page.getByTestId("feedback-survey-disconnected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Connect Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Setup instructions" })).toBeVisible();
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
    await page.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page.getByTestId("feedback-survey-disconnected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveScreenshot("feedback-disconnected-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback delivery disconnected", async ({ page }) => {
    test.setTimeout(60_000);
    await bootMetrioFeedbackDisconnected(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Delivery$/i }).click();
    await expect(page.getByTestId("feedback-delivery-disconnected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-tab-panel-delivery")).toHaveScreenshot(
      "feedback-delivery-disconnected.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback results disconnected", async ({ page }) => {
    test.setTimeout(60_000);
    await bootMetrioFeedbackDisconnected(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Results$/i }).click();
    await expect(page.getByTestId("feedback-results-disconnected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-tab-panel-results")).toHaveScreenshot(
      "feedback-results-disconnected.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback history empty", async ({ page }) => {
    test.setTimeout(60_000);
    await bootMetrioFeedbackDisconnected(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^History$/i }).click();
    await expect(page.getByTestId("feedback-history-empty")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-tab-panel-history")).toHaveScreenshot(
      "feedback-history-empty.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback cycles empty", async ({ page }) => {
    test.setTimeout(60_000);
    await bootMetrioFeedbackDisconnected(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycles-empty")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-tab-panel-cycles")).toHaveScreenshot(
      "feedback-cycles-empty.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback cycles populated", async ({ page }) => {
    test.setTimeout(60_000);
    const surveyJson = serializeFeedbackCyclesPopulatedSurveyForPlaywright();
    await page.addInitScript(
      ({ prefs, survey }: { prefs: string; survey: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-preferences", prefs);
        localStorage.setItem("metrio-visual-survey-data", survey);
      },
      {
        prefs: serializeFeedbackVisualPrefsForPlaywright(),
        survey: surveyJson,
      },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycle-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("feedback-tab-panel-cycles")).toHaveScreenshot(
      "feedback-cycles-populated.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback survey disconnected 1440", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFeedbackDisconnectedState(page);
    await expect(page.getByTestId("feedback-tab-panel-survey")).toHaveScreenshot(
      "feedback-survey-disconnected-1440.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback survey disconnected 1728", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1728, height: 1117 });
    await openFeedbackDisconnectedState(page);
    await expect(page.getByTestId("feedback-tab-panel-survey")).toHaveScreenshot(
      "feedback-survey-disconnected-1728.png",
      { maxDiffPixelRatio: 0.02 },
    );
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

  test("person-brief-kpi-three-column", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-person-brief", {
          detail: { personId: "person-01" },
        }),
      );
    });
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    const metrics = page.locator(".performance-metrics--brief");
    await expect(metrics).toBeVisible();
    await expect(metrics).toHaveScreenshot("person-brief-kpi-three-column.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person-brief-current-work-links", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.getByRole("button", { name: "Brief" }).click();
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    const work = page.locator(".person-brief__work-list").first();
    if (await work.isVisible().catch(() => false)) {
      await expect(work).toHaveScreenshot("person-brief-current-work-links.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("person-brief-attention-table", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.getByRole("button", { name: "Brief" }).click();
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    const table = page.getByTestId("person-brief-drawer").getByTestId("attention-signals-table");
    if (await table.isVisible().catch(() => false)) {
      await expect(table).toHaveScreenshot("person-brief-attention-table.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("person-brief-attention-expanded", async ({ page }) => {
    await bootMetrio(page, "lead");
    const directReports = ["person-01", "person-02", "person-03", "person-04", "person-05"];
    let captured = false;
    for (const personId of directReports) {
      await page.evaluate((id) => {
        window.dispatchEvent(
          new CustomEvent("metrio-open-person-brief", { detail: { personId: id } }),
        );
      }, personId);
      await expect(page.getByTestId("person-brief-drawer")).toBeVisible({ timeout: 15_000 });
      const table = page.getByTestId("person-brief-drawer").getByTestId("attention-signals-table");
      const closeBrief = page.locator(".drawer--person-brief .icon-btn[aria-label='Close drawer']");
      if (!(await table.isVisible().catch(() => false))) {
        await closeBrief.click();
        continue;
      }
      const expand = table.getByRole("button", { name: /View \d+ more/i });
      if (!(await expand.isVisible().catch(() => false))) {
        await closeBrief.click();
        continue;
      }
      await expand.click();
      await expect(table).toHaveScreenshot("person-brief-attention-expanded.png", {
        maxDiffPixelRatio: 0.02,
      });
      captured = true;
      break;
    }
    expect(captured).toBe(true);
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
    const palette = page.getByTestId("command-palette");
    await expect(page.locator(".command-palette-shell.is-open")).toBeVisible();
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("textbox", { name: "Quick find" })).toBeVisible();
    await expect(palette).toHaveScreenshot("search-open.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("command palette search issue", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.keyboard.press("Meta+k");
    const palette = page.getByTestId("command-palette");
    await expect(palette).toBeVisible();
    const input = palette.getByRole("textbox", { name: "Quick find" });
    await expect(input).toBeVisible();
    await input.fill("UX-2962");
    await expect(palette.getByRole("option", { name: /UX-2962/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(palette.locator(".command-palette__hint")).toHaveCount(0);
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
    const palette = page.getByTestId("command-palette");
    await expect(page.locator(".command-palette-shell.is-open")).toBeVisible();
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("textbox", { name: "Quick find" })).toBeVisible();
    await expect(palette).toHaveScreenshot("search-dark.png", {
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

  test("switch geometry", async ({ page }) => {
    await gotoSwitchVisualFixture(page);
    await assertSwitchGeometry(page, "switch-visual-off", "unchecked");
    await assertSwitchGeometry(page, "switch-visual-on", "checked");
  });

  test("switch-states-light", async ({ page }) => {
    await gotoSwitchVisualFixture(page, "light");
    await expect(page.getByTestId("switch-visual-fixture")).toHaveScreenshot(
      "switch-states-light.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("switch-states-dark", async ({ page }) => {
    await gotoSwitchVisualFixture(page, "dark");
    await expect(page.getByTestId("switch-visual-fixture")).toHaveScreenshot(
      "switch-states-dark.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("switch-focus-light", async ({ page }) => {
    await gotoSwitchVisualFixture(page, "light");
    await page.getByTestId("switch-visual-focus-off").focus();
    await expect(page.getByTestId("switch-visual-fixture")).toHaveScreenshot(
      "switch-focus-light.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("switch-focus-dark", async ({ page }) => {
    await gotoSwitchVisualFixture(page, "dark");
    await page.getByTestId("switch-visual-focus-on").focus();
    await expect(page.getByTestId("switch-visual-fixture")).toHaveScreenshot(
      "switch-focus-dark.png",
      { maxDiffPixelRatio: 0.02 },
    );
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
    await expect(page).toHaveScreenshot("settings-preferences-wide.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
    await expect(page.locator(".settings-toggle-stack").first()).toHaveScreenshot(
      "settings-switch-dividers.png",
      { maxDiffPixelRatio: 0.02 },
    );
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
    await card.getByRole("button", { name: /^change$/i }).click();
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
    await card.getByRole("button", { name: /^change$/i }).click();
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
    await expect(page.locator(".metrio-collapsible.is-open")).toHaveCount(0);
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
    await expect(page.getByTestId("company-readonly-summary")).toHaveScreenshot(
      "company-card.png",
      { maxDiffPixelRatio: 0.02 },
    );
    await expect(page.getByTestId("about-settings")).toHaveScreenshot("about-card.png", {
      maxDiffPixelRatio: 0.02,
    });
    await expect(page.getByTestId("about-update-status")).toHaveScreenshot(
      "about-review-updater.png",
      { maxDiffPixelRatio: 0.02 },
    );
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
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("about-settings")).toHaveScreenshot("about-card-dark.png", {
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
    await openResourceLibrary(page);
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
    const section = page.locator(".executive-dashboard .executive-lower-section").first();
    await expect(section).toBeVisible();
    await expect(page.getByText("UX Team Handbook")).toBeVisible();
    await expect(section).toHaveScreenshot("home-relevant-knowledge.png", {
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
    await openResourceLibrary(page);
    await expect(page).toHaveScreenshot("home-resource-library-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  async function bootDashboardManager(page: Page, width?: number) {
    if (width) {
      await page.setViewportSize({ width, height: 900 });
    }
    await page.addInitScript(
      ({ fixtureId, ephemeralKeys }: { fixtureId: string; ephemeralKeys: string[] }) => {
        for (const key of ephemeralKeys) {
          localStorage.removeItem(key);
        }
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", "light");
      },
      { fixtureId: "lead", ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS] },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  }

  test("dashboard new assignments compact row", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const teamActions = page.getByRole("region", { name: "Team actions" });
    await expect(teamActions).toBeVisible();
    const row = teamActions.locator("tbody tr").first();
    await expect(row).toBeVisible();
    await expect(row).toHaveScreenshot("dashboard-new-assignments-row.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard upcoming availability row", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const card = page.getByRole("region", { name: "Team capacity" });
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("dashboard-upcoming-availability.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("initial-connection-screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Connect your work tools")).toBeVisible();
    await expect(page).toHaveScreenshot("initial-connection-screen.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("initial-connection-logo-1280", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("connection-screen-logo")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("initial-connection-logo-1280.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("initial-connection-logo-1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("connection-screen-logo")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("initial-connection-logo-1440.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("initial-connection-logo-dark", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("metrio-theme", "dark");
    });
    await page.goto("/");
    await expect(page.getByTestId("connection-screen-logo")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("initial-connection-logo-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("analytics drawer shows aggregate state without empty contradiction", async ({
    page,
  }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page.getByText("No completed work in this period.")).toHaveCount(0);
    await expect(page).toHaveScreenshot("analytics-completed-drawer-trust.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

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

  test("executive-dashboard-1440", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    await expect(page).toHaveScreenshot("executive-dashboard-1440.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("executive-dashboard-1728", async ({ page }) => {
    await bootDashboardManager(page, 1728);
    await expect(page).toHaveScreenshot("executive-dashboard-1728.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-first-viewport", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const viewport = page.getByTestId("dashboard-first-viewport");
    await expect(viewport).toBeVisible();
    await expect(viewport).toHaveScreenshot("dashboard-first-viewport.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  async function bootDashboardWithCache(
    page: Page,
    options: {
      theme?: "light" | "dark";
      delayMs?: number;
      failRefresh?: boolean;
      width?: number;
      path?: string;
    } = {},
  ) {
    const theme = options.theme ?? "light";
    const cache = serializeDashboardCacheVisualFixtureForPlaywright();
    if (options.width) {
      await page.setViewportSize({ width: options.width, height: 900 });
    }
    await page.clock.install({ time: new Date("2026-10-03T09:30:00+02:00") });
    await page.addInitScript(
      ({ fixtureId, cachePayload, themeId, delayMs, failRefresh }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", themeId);
        localStorage.setItem("metrio-visual-dashboard-cache", cachePayload);
        if (delayMs > 0) {
          localStorage.setItem("metrio-visual-performance-delay-ms", String(delayMs));
        }
        if (failRefresh) {
          localStorage.setItem("metrio-visual-performance-fail", "1");
        }
      },
      {
        fixtureId: "lead",
        cachePayload: cache,
        themeId: theme,
        delayMs: options.delayMs ?? 0,
        failRefresh: options.failRefresh ?? false,
      },
    );
    await page.goto(options.path ?? "/");
  }

  test("dashboard-first-launch-loading", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-03T09:30:00+02:00") });
    await page.addInitScript(
      ({ fixtureId }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", "light");
        localStorage.removeItem("metrio-visual-dashboard-cache");
        localStorage.setItem("metrio-visual-performance-delay-ms", "600000");
      },
      { fixtureId: "lead" },
    );
    await page.goto("/");
    await expect(page.getByTestId("home-loading")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("dashboard-first-launch-loading.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-cached-refreshing", async ({ page }) => {
    await bootDashboardWithCache(page, { width: 1440, delayMs: 600_000 });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-sync-status")).toContainText(
      /Refreshing/,
    );
    await expect(page).toHaveScreenshot("dashboard-cached-refreshing.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-cached-refresh-failed", async ({ page }) => {
    await bootDashboardWithCache(page, { width: 1440, failRefresh: true });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-sync-status")).toContainText(
      /Couldn't refresh/,
    );
    await expect(page).toHaveScreenshot("dashboard-cached-refresh-failed.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-first-run", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
      localStorage.removeItem("metrio-visual-dashboard-cache");
    }, "lead");
    await page.goto("/?visualHomeState=first-run");
    await expect(page.getByTestId("dashboard-first-run")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("No performance data yet")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-first-run.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-refreshing-with-cache", async ({ page }) => {
    await bootDashboardWithCache(page, { width: 1440, delayMs: 600_000 });
    await expect(page.getByTestId("dashboard-refreshing-with-cache")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("dashboard-sync-status")).toContainText(/Refreshing/);
    await expect(page).toHaveScreenshot("dashboard-refreshing-with-cache.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-refresh-stuck", async ({ page }) => {
    await bootDashboardWithCache(page, {
      width: 1440,
      path: "/?visualHomeState=refresh-stuck",
    });
    await expect(page.getByTestId("dashboard-refresh-stuck")).toBeVisible({ timeout: 15_000 });
    const banner = page.getByTestId("dashboard-sync-banner");
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-refresh-stuck.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-refresh-failed-with-cache", async ({ page }) => {
    await bootDashboardWithCache(page, {
      width: 1440,
      failRefresh: true,
      path: "/?visualHomeState=refresh-failed-with-cache",
    });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-sync-status")).toContainText(
      /Couldn't refresh/,
    );
    await expect(page).toHaveScreenshot("dashboard-refresh-failed-with-cache.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-refresh-failed-no-cache", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-03T09:30:00+02:00") });
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
      localStorage.removeItem("metrio-visual-dashboard-cache");
      localStorage.setItem("metrio-visual-performance-fail", "1");
    }, "lead");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-blocking-error")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Open Performance/i })).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-refresh-failed-no-cache.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-employee-1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootConnected(page, "employee", "light");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-scope-health")).toBeVisible();
    await expect(page.getByTestId("dashboard-kpi-strip")).toBeVisible();
    await expect(page.getByTestId("dashboard-first-viewport")).toHaveScreenshot(
      "dashboard-employee-1440.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("dashboard-manager-1440-first-viewport", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    await expect(page.getByTestId("dashboard-first-viewport")).toHaveScreenshot(
      "dashboard-manager-1440-first-viewport.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("dashboard-director-1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootConnected(page, "director", "light");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-first-viewport")).toHaveScreenshot(
      "dashboard-director-1440.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("dashboard-director-dark", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await bootConnected(page, "director", "dark");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-director-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-attention-empty-trend-expanded", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(
      ({ fixtureId, ephemeralKeys }: { fixtureId: string; ephemeralKeys: string[] }) => {
        for (const key of ephemeralKeys) {
          localStorage.removeItem(key);
        }
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", "light");
      },
      { fixtureId: "lead", ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS] },
    );
    await page.goto("/?visualHomeAttentionEmpty=1");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-attention-now")).toHaveCount(0);
    const trend = page.getByTestId("dashboard-primary-trend");
    await expect(trend).toHaveClass(/executive-dashboard__span-12/);
    await expect(trend).toHaveScreenshot("dashboard-attention-empty-trend-expanded.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-secondary-single-full-width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const goalsJson = serializeGoalsVisualFixtureForPlaywright();
    await page.addInitScript(
      ({ fixtureId, goals, ephemeralKeys }: { fixtureId: string; goals: string; ephemeralKeys: string[] }) => {
        for (const key of ephemeralKeys) {
          localStorage.removeItem(key);
        }
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-goals", goals);
      },
      {
        fixtureId: "lead",
        goals: goalsJson,
        ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS],
      },
    );
    await page.goto("/?visualHomeSecondarySingle=1");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const grid = page.getByTestId("dashboard-secondary-grid");
    await expect(grid).toBeVisible();
    await expect(grid).toHaveClass(/executive-dashboard__secondary--single/);
    await expect(grid).toHaveScreenshot("dashboard-secondary-single-full-width.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-fresh", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-03T09:30:00+02:00") });
    await bootDashboardManager(page, 1440);
    await expect(page.getByTestId("dashboard-sync-status")).toHaveCount(0);
    await expect(page).toHaveScreenshot("dashboard-fresh.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dark-cached-refreshing", async ({ page }) => {
    await bootDashboardWithCache(page, {
      theme: "dark",
      width: 1440,
      delayMs: 600_000,
    });
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-sync-status")).toContainText(
      /Refreshing/,
    );
    await expect(page).toHaveScreenshot("dark-cached-refreshing.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-my-focus-deduped", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const focus = page.getByTestId("dashboard-my-focus");
    await expect(focus).toBeVisible();
    const rowCount = await focus.getByTestId("dashboard-action-row").count();
    if (rowCount > 0) {
      await expect(focus.getByRole("button", { name: /Context/i })).toBeVisible();
      await expect(focus).not.toContainText("Status");
      const issueKeys = await focus.getByTestId("dashboard-action-row").allTextContents();
      const duplicates = issueKeys.filter((text, index, all) =>
        all.some((other, otherIndex) => otherIndex !== index && text.split(/\s/)[0] === other.split(/\s/)[0]),
      );
      expect(duplicates).toHaveLength(0);
    }
    await expect(focus).toHaveScreenshot("dashboard-my-focus-deduped.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-team-actions-context", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const teamActions = page.getByTestId("dashboard-team-actions");
    await expect(teamActions.getByRole("button", { name: /Context/i })).toBeVisible();
    await expect(teamActions).toHaveScreenshot("dashboard-team-actions-context.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-secondary-goals-brief", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    await expect(page.getByTestId("dashboard-team-brief")).toBeVisible();
    const grid = page.getByTestId("dashboard-secondary-grid");
    await expect(grid).toBeVisible();
    await expect(grid).toHaveScreenshot("dashboard-secondary-goals-brief.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-no-new-assignments", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    await expect(page.getByText("No new assignments")).toHaveCount(0);
    await expect(page).toHaveScreenshot("dashboard-no-new-assignments.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-manager-1280", async ({ page }) => {
    await bootDashboardManager(page, 1280);
    await expect(page.getByTestId("dashboard-kpi-strip")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-manager-1280.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-manager-1440", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    await expect(page.getByTestId("dashboard-kpi-strip")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-manager-1440.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-manager-1728", async ({ page }) => {
    await bootDashboardManager(page, 1728);
    await expect(page.getByTestId("dashboard-kpi-strip")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-manager-1728.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-manager-dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-manager-dark.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-employee", async ({ page }) => {
    await bootConnected(page, "employee", "light");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-my-focus")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-employee.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-director", async ({ page }) => {
    await bootConnected(page, "director", "light");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-first-viewport")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-director.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-new-starter", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    await expect(page.getByTestId("dashboard-new-starter-row").first()).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-new-starter.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-upcoming-leave", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?visualHomeTimeOff=1");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-upcoming-leave.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-no-secondary-data", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-goals", "[]");
    }, "employee");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dashboard-no-secondary-data.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-refreshing-cache", async ({ page }) => {
    await bootDashboardWithCache(page, { width: 1440, delayMs: 600_000 });
    await expect(page.getByTestId("dashboard-kpi-strip")).toBeVisible();
    await expect(page).toHaveScreenshot("dashboard-refreshing-cache.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard-team-actions-long-label", async ({ page }) => {
    await bootDashboardManager(page, 1280);
    const cta = page.getByTestId("dashboard-team-actions").getByRole("button", {
      name: /Open Delivery Risk/i,
    });
    await expect(cta.first()).toBeVisible();
    const box = await cta.first().boundingBox();
    expect(box).not.toBeNull();
    await expect(page.getByTestId("dashboard-team-actions")).toHaveScreenshot(
      "dashboard-team-actions-long-label.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("dashboard-chart-tooltip", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const pulse = page.getByTestId("dashboard-performance-pulse");
    await expect(pulse).toBeVisible();
    const chart = pulse.locator(".recharts-surface").first();
    await chart.hover({ position: { x: 40, y: 20 } });
    await expect(page.locator(".trend-chart-tooltip")).toBeVisible();
    await expect(pulse).toHaveScreenshot("dashboard-chart-tooltip.png", {
      maxDiffPixelRatio: 0.03,
    });
  });

  test("dark-dashboard", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("dark-dashboard.png", {
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

  test("person-completed-one-with-evidence", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).first().click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page.getByText("No completed work in this period.")).toHaveCount(0);
    await expect(page).toHaveScreenshot("person-completed-one-with-evidence.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person-completed-zero", async ({ page }) => {
    await bootMetrio(page, "employee");
    await page.locator(".app-header__nav-link").filter({ hasText: "Performance" }).click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    const completed = page.getByRole("button", { name: /View Completed details/i });
    if (await completed.count()) {
      await completed.first().click();
      await expect(page.locator(".drawer--analytics")).toBeVisible();
    }
    await expect(page).toHaveScreenshot("person-completed-zero.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("team-first-pass-evidence", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View First pass details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("team-first-pass-evidence.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("team-backflow-events", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Backflows details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("team-backflow-events.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("analytics-aggregate-only", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("analytics-aggregate-only.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person-brief-comparison-context", async ({ page }) => {
    await bootMetrio(page, "lead");
    const briefButton = page.getByRole("button", { name: /Prepare for 1:1/i }).first();
    if (await briefButton.count()) {
      await briefButton.click();
    } else {
      await page.getByRole("button", { name: /View person/i }).first().click();
    }
    await expect(page.locator(".drawer")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("person-brief-comparison-context.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("human-duration-short", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("human-duration-short.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("human-duration-long", async ({ page }) => {
    await bootMetrio(page, "lead");
    const metrics = page.locator(".performance-metrics");
    await expect(metrics).toBeVisible();
    await expect(metrics).toHaveScreenshot("human-duration-long.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("humanized-status-values", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("humanized-status-values.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dark analytics aggregate", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await openPerformanceFromHome(page);
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("dark-analytics-aggregate.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("button-size-system", async ({ page }) => {
    await bootMetrio(page, "lead");
    await expect(page.locator(".performance-metrics").first()).toBeVisible();
    await expect(page.locator(".performance-metrics").first()).toHaveScreenshot(
      "button-size-system.png",
      { maxDiffPixelRatio: 0.03 },
    );
  });

  test("card-surface-light", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".home-card").first()).toHaveScreenshot("card-surface-light.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("card-surface-dark", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "dark");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".home-card").first()).toHaveScreenshot("card-surface-dark.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("semantic-badge-map", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const teamActions = page.getByRole("region", { name: "Team actions" });
    await expect(teamActions).toBeVisible();
    await expect(teamActions).toHaveScreenshot("semantic-badge-map.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("compact-action-row", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const teamActions = page.getByRole("region", { name: "Team actions" });
    const row = teamActions.locator("tbody tr").first();
    await expect(row).toBeVisible();
    await expect(row).toHaveScreenshot("compact-action-row.png", { maxDiffPixelRatio: 0.02 });
  });

  test("drawer-header-notifications", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await expect(page.locator(".drawer__header")).toHaveScreenshot("drawer-header-notifications.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("drawer-header-goal", async ({ page }) => {
    await bootGoalsVisual(page, "lead", "light");
    await page.getByTestId("goal-list-row").first().getByRole("button", { name: "Open goal" }).click();
    await expect(page.getByTestId("goal-detail-drawer")).toBeVisible();
    await expect(page.locator(".drawer__header")).toHaveScreenshot("drawer-header-goal.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("drawer-header-person", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View person/i }).first().click();
    await expect(page.locator(".drawer--person, .drawer")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".drawer__header")).toHaveScreenshot("drawer-header-person.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("drawer-header-analytics", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page.locator(".drawer__header")).toHaveScreenshot("drawer-header-analytics.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("empty-state-light", async ({ page }) => {
    test.setTimeout(60_000);
    await openFeedbackDisconnectedState(page);
    await expect(page.locator(".feedback-empty-state").first()).toHaveScreenshot(
      "empty-state-light.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("empty-state-dark", async ({ page }) => {
    test.setTimeout(60_000);
    await bootMetrioFeedbackDisconnected(page, "dark");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page.getByTestId("feedback-survey-disconnected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".feedback-empty-state").first()).toHaveScreenshot(
      "empty-state-dark.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("focus-states", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/^api token$/i).focus();
    await expect(page).toHaveScreenshot("focus-states.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("new-starter-card", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const section = page.getByRole("region", { name: "New starters" });
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot("new-starter-card.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("upcoming-time-off", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/?visualHomeTimeOff=1");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const card = page.getByRole("region", { name: "Team capacity" });
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("upcoming-time-off.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("team-availability", async ({ page }) => {
    await bootDashboardManager(page, 1440);
    const card = page.getByRole("region", { name: "Team capacity" });
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("team-availability.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("stored-jira-token", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-visual-secure-store", "all");
      localStorage.setItem(
        "metrio-connection-config",
        JSON.stringify({ workEmail: "lead@altenar.com" }),
      );
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    const card = page.getByTestId("settings-jira-card");
    await expect(card.getByTestId("settings-credential-stored")).toHaveText(
      "Stored securely",
    );
    await expect(card).toHaveScreenshot("stored-jira-token.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("edit-jira-token", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-visual-secure-store", "all");
      localStorage.setItem(
        "metrio-connection-config",
        JSON.stringify({ workEmail: "lead@altenar.com" }),
      );
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    const card = page.getByTestId("settings-jira-card");
    await card.getByRole("button", { name: /^change$/i }).click();
    await expect(card.getByRole("button", { name: /^test connection$/i })).toBeVisible();
    await expect(card).toHaveScreenshot("edit-jira-token.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("stored-bamboo-key", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-visual-secure-store", "all");
      localStorage.setItem(
        "metrio-connection-config",
        JSON.stringify({ workEmail: "lead@altenar.com" }),
      );
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    const card = page.getByTestId("settings-bamboo-card");
    await expect(card.getByTestId("settings-credential-stored")).toHaveText(
      "Stored securely",
    );
    await expect(card).toHaveScreenshot("stored-bamboo-key.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dark-connection-screen", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-theme", "dark");
    });
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("dark-connection-screen.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("connection-error", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/^work email/i).fill("user@altenar.com");
    await page.getByLabel(/^api token$/i).fill("bad");
    await page.getByLabel(/^api key$/i).fill("bad");
    await page.getByRole("button", { name: /connect & continue/i }).click();
    await expect(page.getByTestId("connection-jira-error")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveScreenshot("connection-error.png", {
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

  test("team-attention-interactive-issues", async ({ page }) => {
    await bootMetrio(page, "lead");
    const section = page.getByRole("region", { name: "Team attention" });
    await expect(section.locator(".entity-link").first()).toBeVisible({ timeout: 15_000 });
    await expect(section).toHaveScreenshot("team-attention-interactive-issues.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("team-attention-expanded", async ({ page }) => {
    await bootMetrio(page, "lead");
    const section = page.getByRole("region", { name: "Team attention" });
    const more = section.getByRole("button", { name: /View \d+ more/i }).first();
    if (await more.isVisible().catch(() => false)) {
      await more.click();
    }
    await expect(section).toHaveScreenshot("team-attention-expanded.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("team-workload-identities", async ({ page }) => {
    await bootMetrio(page, "lead");
    const section = page.getByRole("region", { name: "Team workload" });
    await expect(section.getByTestId("person-avatar").first()).toBeVisible();
    await expect(section).toHaveScreenshot("team-workload-identities.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("performance-overview", async ({ page }) => {
    await bootMetrio(page, "lead");
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible();
    await expect(page).toHaveScreenshot("performance-overview.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("people", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^people$/i);
    await expect(page).toHaveScreenshot("people.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("people-clickable-attention", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^people$/i);
    const people = page.getByTestId("team-people-view");
    const link = people.locator(".entity-link").first();
    if (await link.isVisible().catch(() => false)) {
      await expect(people).toHaveScreenshot("people-clickable-attention.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("badge-no-wrap", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await bootMetrio(page, "lead");
    await expect(page.locator(".badge").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Team attention" })).toHaveScreenshot(
      "badge-no-wrap-1280.png",
      { maxDiffPixelRatio: 0.02 },
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("region", { name: "Team attention" })).toHaveScreenshot(
      "badge-no-wrap-1440.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("radar", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^radar$/i);
    await expect(page).toHaveScreenshot("radar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("radar-action-buttons", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^radar$/i);
    await expect(
      page
        .getByTestId("team-radar-view")
        .getByRole("button", { name: /Review workload|View person/i })
        .first(),
    ).toBeVisible();
    await expect(page.getByTestId("team-radar-view")).toHaveScreenshot("radar-action-buttons.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("radar-clickable-issue", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^radar$/i);
    const radar = page.getByTestId("team-radar-view");
    const issueLink = radar.locator(".entity-link").first();
    await expect(issueLink).toBeVisible({ timeout: 15_000 });
    await expect(radar).toHaveScreenshot("radar-clickable-issue.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("project-cockpit", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-project-cockpit", {
          detail: { projectKey: "UX" },
        }),
      );
    });
    await expect(page.getByTestId("project-cockpit")).toBeVisible();
    await expect(page).toHaveScreenshot("project-cockpit.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dependencies", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-project-cockpit", {
          detail: { projectKey: "UX" },
        }),
      );
    });
    const section = page.getByTestId("project-cockpit-dependencies");
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot("dependencies.png", {
      maxDiffPixelRatio: 0.02,
    });
    const table = page.getByTestId("project-cockpit-dependencies-table");
    if ((await table.count()) > 0) {
      await expect(table).toHaveScreenshot("dependencies-table.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("multiline table row global", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-project-cockpit", {
          detail: { projectKey: "UX" },
        }),
      );
    });
    await expect(page.getByTestId("project-cockpit")).toBeVisible();
    const wrap = page.locator(".performance-table-wrap .performance-table__clamp").first();
    if ((await wrap.count()) > 0) {
      await expect(wrap).toHaveScreenshot("multiline-row-global.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("meetings", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-03T09:30:00+02:00") });
    const calendarJson = serializeCalendarVisualFixtureForPlaywright();
    const prefsJson = serializeFeedbackVisualPrefsForPlaywright();
    await page.addInitScript(
      ({ payload, prefs }: { payload: string; prefs: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-calendar-visual-fixture", payload);
        const parsed = JSON.parse(prefs) as { google: Record<string, unknown> };
        parsed.google = { ...parsed.google, calendarConnected: true };
        localStorage.setItem("metrio-visual-preferences", JSON.stringify(parsed));
      },
      { payload: calendarJson, prefs: prefsJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("home-upcoming-meetings")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("home-upcoming-meetings")).toHaveScreenshot(
      "meetings.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("onboarding", async ({ page }) => {
    const onboardingJson = serializeOnboardingChecklistVisualFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "employee");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-onboarding-checklist", payload);
    }, onboardingJson);
    await page.goto("/");
    await expect(page.getByTestId("onboarding-checklist-card")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("onboarding-checklist-card")).toHaveScreenshot(
      "onboarding.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("resource-library", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await openResourceLibrary(page);
    await expect(page.getByTestId("resource-library")).toHaveScreenshot(
      "resource-library.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback-connected-survey", async ({ page }) => {
    await bootMetrioFeedback(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page.locator(".feedback-google-strip")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("feedback-connected-survey.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("feedback-recipients", async ({ page }) => {
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
    await page.getByRole("button", { name: /review recipients/i }).click();
    await expect(page.getByTestId("feedback-recipients-drawer")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-recipients-drawer")).toHaveScreenshot(
      "feedback-recipients.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback-delivery", async ({ page }) => {
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
    await expect(page.getByTestId("feedback-tab-panel-delivery")).toHaveScreenshot(
      "feedback-delivery.png",
      { maxDiffPixelRatio: 0.02 },
    );
    await expect(page.getByTestId("feedback-delivery-table")).toHaveScreenshot(
      "feedback-delivery-table.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback-results", async ({ page }) => {
    await bootMetrioFeedback(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Results$/i }).click();
    await expect(page.getByTestId("feedback-tab-panel-results")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-tab-panel-results")).toHaveScreenshot(
      "feedback-results.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback-history", async ({ page }) => {
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
    await page.getByRole("button", { name: /^History$/i }).click();
    await expect(page.getByTestId("feedback-history-table")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-history-table")).toHaveScreenshot(
      "feedback-history-table.png",
      { maxDiffPixelRatio: 0.02 },
    );
    const historyTable = page.getByTestId("feedback-history-table");
    await historyTable.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page.getByTestId("feedback-history-table")).toHaveScreenshot(
      "feedback-history-sorted.png",
      { maxDiffPixelRatio: 0.02 },
    );
    await expect(page.getByTestId("feedback-tab-panel-history")).toHaveScreenshot(
      "feedback-history.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback-history-dark", async ({ page }) => {
    const surveyJson = serializeFeedbackDeliveryVisualSurveyForPlaywright();
    const prefsJson = serializeFeedbackVisualPrefsForPlaywright();
    await page.addInitScript(
      ({ prefs, survey }: { prefs: string; survey: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "dark");
        localStorage.setItem("metrio-visual-preferences", prefs);
        localStorage.setItem("metrio-visual-survey-data", survey);
      },
      { prefs: prefsJson, survey: surveyJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^History$/i }).click();
    await expect(page.getByTestId("feedback-history-table")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-history-table")).toHaveScreenshot(
      "feedback-history-dark.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("feedback-cycle-populated", async ({ page }) => {
    test.setTimeout(60_000);
    const surveyJson = serializeFeedbackCyclesPopulatedSurveyForPlaywright();
    await page.addInitScript(
      ({ fixtureId, prefs, survey }: { fixtureId: string; prefs: string; survey: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", fixtureId);
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-preferences", prefs);
        localStorage.setItem("metrio-visual-survey-data", survey);
      },
      {
        fixtureId: "lead",
        prefs: serializeFeedbackVisualPrefsForPlaywright(),
        survey: surveyJson,
      },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycle-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("feedback-cycle-card")).toHaveScreenshot(
      "feedback-cycle-populated.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("notifications-empty-source", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-notification-events", "[]");
    });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^Notifications$/i }).click();
    await page
      .locator(".drawer--notifications")
      .getByRole("button", { name: "Jira", exact: true })
      .click();
    await expect(page.getByText("No Jira notifications")).toBeVisible();
    await expect(page.locator(".drawer--notifications")).toHaveScreenshot(
      "notifications-empty-source.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("people-with-photos", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^people$/i);
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot("people-with-photos.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
    const withPhoto = page.locator(".person-avatar__photo").first();
    if ((await withPhoto.count()) > 0) {
      await expect(withPhoto).toHaveScreenshot("person-real-photo.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("people-mixed-photo-fallback", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^people$/i);
    await expect(page.locator('[data-testid="person-avatar"]').first()).toBeVisible();
    await expect(page).toHaveScreenshot("people-mixed-photo-fallback.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
    const initialsAvatar = page.locator(".person-avatar:not(:has(.person-avatar__photo))").first();
    if ((await initialsAvatar.count()) > 0) {
      await expect(initialsAvatar).toHaveScreenshot("person-fallback-initials.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("person-drawer-photo", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.waitForTimeout(200);
    const drawer = page.locator(".drawer--person-detail");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveScreenshot("person-drawer-photo.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("person-brief-photo", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.getByRole("button", { name: "Brief" }).click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId("person-brief-drawer")).toBeVisible();
    await expect(page.getByTestId("person-brief-drawer")).toHaveScreenshot(
      "person-brief-photo.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("dashboard-team-actions-photo", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
    });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const row = page.getByTestId("dashboard-action-row").first();
    if (await row.isVisible().catch(() => false)) {
      await expect(row).toHaveScreenshot("dashboard-team-actions-photo.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("new-starter-photo", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
    });
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const starter = page.getByTestId("dashboard-new-starter-row").first();
    if (await starter.isVisible().catch(() => false)) {
      await page.waitForTimeout(200);
      await expect(starter).toHaveScreenshot("new-starter-photo.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("notification-person-photo", async ({ page }) => {
    await bootMetrioWithNotificationFixture(page, 6);
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await page.waitForTimeout(200);
    await expect(page.locator(".drawer--notifications")).toHaveScreenshot(
      "notification-person-photo.png",
      { maxDiffPixelRatio: 0.02 },
    );
  });

  test("dark-person-photo", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "dark");
    });
    await page.goto("/");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^people$/i);
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot("dark-person-photo.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

/**
 * Executive demo visual acceptance captures (1440×900 primary).
 * Screenshots are the source of truth for docs/executive-demo-visual-acceptance.md.
 */
import { test, expect } from "@playwright/test";
import {
  bootConnected,
  bootDashboardManager,
  bootMetrio,
  bootGoalsVisual,
  bootMetrioFeedback,
  bootFeedbackDisconnected,
  bootNotifications,
  clickSubnav,
  clickSettingsSection,
  openFirstAttentionPerson,
  openDirectReportPersonBrief,
  openPerformanceFromHome,
  openResourceLibrary,
  setViewport,
  serializeFeedbackCyclesPopulatedSurveyForPlaywright,
  serializeFeedbackDeliveryVisualSurveyForPlaywright,
  serializeFeedbackVisualPrefsForPlaywright,
  serializeOnboardingChecklistVisualFixtureForPlaywright,
  serializeCalendarVisualFixtureForPlaywright,
} from "./visualBoot";
import { serializeDigestVisualPrefsForPlaywright } from "../../src/fixtures/digestVisualFixture";

const SHOT = { fullPage: true, maxDiffPixelRatio: 0.03 };

test.beforeEach(async ({ page }) => {
  await setViewport(page, 1440, 900);
});

test.describe("Executive acceptance — light 1440×900", () => {
  test("01-dashboard-manager", async ({ page }) => {
    const prefs = serializeDigestVisualPrefsForPlaywright();
    await page.addInitScript((p: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-preferences", p);
    }, prefs);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("01-dashboard-manager.png", SHOT);
  });

  test("02-dashboard-employee", async ({ page }) => {
    await bootConnected(page, "employee", "light");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveScreenshot("02-dashboard-employee.png", SHOT);
  });

  test("03-dashboard-new-starter", async ({ page }) => {
    const onboarding = serializeOnboardingChecklistVisualFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "employee");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-onboarding-checklist", payload);
    }, onboarding);
    await page.goto("/");
    await expect(page.getByTestId("onboarding-checklist-card")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveScreenshot("03-dashboard-new-starter.png", SHOT);
  });

  test("04-performance-overview", async ({ page }) => {
    await bootMetrio(page, "lead");
    await expect(page).toHaveScreenshot("04-performance-overview.png", SHOT);
  });

  test("05-people", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^people$/i);
    await expect(page).toHaveScreenshot("05-people.png", SHOT);
  });

  test("06-radar", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /^radar$/i);
    await expect(page).toHaveScreenshot("06-radar.png", SHOT);
  });

  test("07-delivery-risk", async ({ page }) => {
    await bootMetrio(page, "lead");
    await clickSubnav(page, /delivery risk/i);
    await expect(page).toHaveScreenshot("07-delivery-risk.png", SHOT);
  });

  test("08-goals-empty", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-goals", "[]");
    });
    await page.goto("/");
    await openPerformanceFromHome(page);
    await clickSubnav(page, /^goals$/i);
    await expect(page.getByTestId("goals-empty-state")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("08-goals-empty.png", SHOT);
  });

  test("09-goals-populated", async ({ page }) => {
    await bootGoalsVisual(page, "lead", "light");
    await expect(page.getByTestId("goals-list")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("09-goals-populated.png", SHOT);
  });

  test("10-goal-drawer", async ({ page }) => {
    await bootGoalsVisual(page, "lead", "light");
    await page.getByTestId("goal-list-row").first().getByRole("button", { name: "Open goal" }).click();
    await expect(page.getByTestId("goal-detail-drawer")).toBeVisible();
    await expect(page).toHaveScreenshot("10-goal-drawer.png", SHOT);
  });

  test("11-person-overview", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await expect(page.locator(".drawer--person-detail")).toBeVisible();
    await expect(page).toHaveScreenshot("11-person-overview.png", SHOT);
  });

  test("12-person-work", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person-detail").getByRole("tab", { name: "Work" }).click();
    await expect(page).toHaveScreenshot("12-person-work.png", SHOT);
  });

  test("13-person-history", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openFirstAttentionPerson(page);
    await page.locator(".drawer--person-detail").getByRole("tab", { name: "History" }).click();
    await expect(page).toHaveScreenshot("13-person-history.png", SHOT);
  });

  test("14-person-brief", async ({ page }) => {
    await bootMetrio(page, "lead");
    await openDirectReportPersonBrief(page);
    await expect(page).toHaveScreenshot("14-person-brief.png", SHOT);
  });

  test("15-analytics-completed", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Completed details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("15-analytics-completed.png", SHOT);
  });

  test("16-analytics-first-pass", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View First pass details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("16-analytics-first-pass.png", SHOT);
  });

  test("17-analytics-efficiency", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Efficiency details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("17-analytics-efficiency.png", SHOT);
  });

  test("18-analytics-backflows", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /View Backflows details/i }).click();
    await expect(page.locator(".drawer--analytics")).toBeVisible();
    await expect(page).toHaveScreenshot("18-analytics-backflows.png", SHOT);
  });

  test("19-weekly-digest", async ({ page }) => {
    const prefs = serializeDigestVisualPrefsForPlaywright();
    await page.addInitScript((p: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-preferences", p);
    }, prefs);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-digest", { detail: { digestKind: "weekly" } }),
      );
    });
    await expect(page.getByTestId("digest-drawer")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("19-weekly-digest.png", SHOT);
  });

  test("20-notifications", async ({ page }) => {
    await bootNotifications(page, "light");
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await expect(page.locator(".drawer--notifications")).toBeVisible();
    await expect(page).toHaveScreenshot("20-notifications.png", SHOT);
  });

  test("21-search", async ({ page }) => {
    await bootDashboardManager(page, "light");
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page).toHaveScreenshot("21-search.png", SHOT);
  });

  test("22-feedback-cycles-empty", async ({ page }) => {
    await bootFeedbackDisconnected(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycles-empty")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("22-feedback-cycles-empty.png", SHOT);
  });

  test("23-feedback-cycles-populated", async ({ page }) => {
    const surveyJson = serializeFeedbackCyclesPopulatedSurveyForPlaywright();
    await page.addInitScript(
      ({ prefs, survey }: { prefs: string; survey: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-preferences", prefs);
        localStorage.setItem("metrio-visual-survey-data", survey);
      },
      { prefs: serializeFeedbackVisualPrefsForPlaywright(), survey: surveyJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Cycles$/i }).click();
    await expect(page.getByTestId("feedback-cycle-card")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("23-feedback-cycles-populated.png", SHOT);
  });

  test("24-feedback-survey-disconnected", async ({ page }) => {
    await bootFeedbackDisconnected(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page.getByTestId("feedback-survey-disconnected")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveScreenshot("24-feedback-survey-disconnected.png", SHOT);
  });

  test("25-feedback-survey-connected", async ({ page }) => {
    await bootMetrioFeedback(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page.locator(".feedback-google-strip")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("25-feedback-survey-connected.png", SHOT);
  });

  test("26-feedback-delivery", async ({ page }) => {
    const surveyJson = serializeFeedbackDeliveryVisualSurveyForPlaywright();
    await page.addInitScript(
      ({ prefs, survey }: { prefs: string; survey: string }) => {
        localStorage.setItem("metrio-connection-connected", "true");
        localStorage.setItem("metrio-dev-fixture", "lead");
        localStorage.setItem("metrio-theme", "light");
        localStorage.setItem("metrio-visual-preferences", prefs);
        localStorage.setItem("metrio-visual-survey-data", survey);
      },
      { prefs: serializeFeedbackVisualPrefsForPlaywright(), survey: surveyJson },
    );
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Delivery$/i }).click();
    await expect(page).toHaveScreenshot("26-feedback-delivery.png", SHOT);
  });

  test("27-feedback-results", async ({ page }) => {
    await bootMetrioFeedback(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Results$/i }).click();
    await expect(page).toHaveScreenshot("27-feedback-results.png", SHOT);
  });

  test("28-feedback-history", async ({ page }) => {
    await bootMetrioFeedback(page, "light");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^History$/i }).click();
    await expect(page).toHaveScreenshot("28-feedback-history.png", SHOT);
  });

  test("29-settings-preferences", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await expect(page.getByTestId("preferences-settings")).toBeVisible();
    await expect(page).toHaveScreenshot("29-settings-preferences.png", SHOT);
  });

  test("30-settings-connections", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    await expect(page).toHaveScreenshot("30-settings-connections.png", SHOT);
  });

  test("31-settings-attention-rules", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /attention rules/i);
    await expect(page.getByTestId("operational-rules-settings")).toBeVisible();
    await expect(page).toHaveScreenshot("31-settings-attention-rules.png", SHOT);
  });

  test("32-settings-company-app", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page).toHaveScreenshot("32-settings-company-app.png", SHOT);
  });

  test("33-diagnostics", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("diagnostics-settings")).toBeVisible();
    await expect(page.getByTestId("diagnostics-settings")).toHaveScreenshot(
      "33-diagnostics.png",
      SHOT,
    );
  });

  test("34-resource-library", async ({ page }) => {
    await bootDashboardManager(page, "light");
    await openResourceLibrary(page);
    await expect(page).toHaveScreenshot("34-resource-library.png", SHOT);
  });

  test("35-onboarding", async ({ page }) => {
    const onboarding = serializeOnboardingChecklistVisualFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "employee");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-onboarding-checklist", payload);
    }, onboarding);
    await page.goto("/");
    await expect(page.getByTestId("onboarding-checklist-card")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("onboarding-checklist-card")).toHaveScreenshot(
      "35-onboarding.png",
      SHOT,
    );
  });

  test("36-project-cockpit", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-project-cockpit", { detail: { projectKey: "UX" } }),
      );
    });
    await expect(page.getByTestId("project-cockpit")).toBeVisible();
    await expect(page).toHaveScreenshot("36-project-cockpit.png", SHOT);
  });

  test("37-dependencies", async ({ page }) => {
    await bootMetrio(page, "lead");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("metrio-open-project-cockpit", { detail: { projectKey: "UX" } }),
      );
    });
    const section = page.getByTestId("project-cockpit-dependencies");
    await expect(section).toBeVisible();
    await expect(section).toHaveScreenshot("37-dependencies.png", SHOT);
  });

  test("38-calendar-meetings", async ({ page }) => {
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
      "38-calendar-meetings.png",
      SHOT,
    );
  });

  test("39-initial-connection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("connection-screen")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot("39-initial-connection.png", SHOT);
  });

  test("40-profile-menu", async ({ page }) => {
    await bootDashboardManager(page, "light");
    await page.getByRole("button", { name: /open profile menu/i }).click();
    await expect(page.getByRole("menu", { name: "Profile menu" })).toBeVisible();
    await expect(page).toHaveScreenshot("40-profile-menu.png", SHOT);
  });
});

test.describe("Executive acceptance — dark subset 1440×900", () => {
  test("dark-dashboard", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page, "dark");
    await expect(page).toHaveScreenshot("dark-01-dashboard.png", SHOT);
  });

  test("dark-performance-overview", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead", "dark");
    await openPerformanceFromHome(page);
    await expect(page).toHaveScreenshot("dark-04-performance-overview.png", SHOT);
  });

  test("dark-delivery-risk", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead", "dark");
    await openPerformanceFromHome(page);
    await clickSubnav(page, /delivery risk/i);
    await expect(page).toHaveScreenshot("dark-07-delivery-risk.png", SHOT);
  });

  test("dark-goals", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootGoalsVisual(page, "lead", "dark");
    await expect(page).toHaveScreenshot("dark-09-goals.png", SHOT);
  });

  test("dark-person", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead", "dark");
    await openPerformanceFromHome(page);
    await openFirstAttentionPerson(page);
    await expect(page).toHaveScreenshot("dark-11-person.png", SHOT);
  });

  test("dark-person-brief", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead", "dark");
    await openPerformanceFromHome(page);
    await openDirectReportPersonBrief(page);
    await expect(page).toHaveScreenshot("dark-14-person-brief.png", SHOT);
  });

  test("dark-notifications", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootNotifications(page, "dark");
    await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
    await expect(page).toHaveScreenshot("dark-20-notifications.png", SHOT);
  });

  test("dark-search", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page, "dark");
    await page.keyboard.press("Meta+k");
    await expect(page).toHaveScreenshot("dark-21-search.png", SHOT);
  });

  test("dark-feedback-survey", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrioFeedback(page, "dark");
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^Survey$/i }).click();
    await expect(page).toHaveScreenshot("dark-25-feedback-survey.png", SHOT);
  });

  test("dark-settings-connections", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead", "dark");
    await openPerformanceFromHome(page);
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /^connections$/i);
    await expect(page).toHaveScreenshot("dark-30-settings-connections.png", SHOT);
  });

  test("dark-diagnostics", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead", "dark");
    await openPerformanceFromHome(page);
    await page.getByRole("button", { name: /^settings$/i }).click();
    await clickSettingsSection(page, /company & app/i);
    await expect(page.getByTestId("diagnostics-settings")).toBeVisible();
    await expect(page.getByTestId("diagnostics-settings")).toHaveScreenshot(
      "dark-33-diagnostics.png",
      SHOT,
    );
  });
});

test.describe("Executive acceptance — high-risk viewports", () => {
  const risky = [
    { w: 1280, h: 800, tag: "1280x800" },
    { w: 1728, h: 1117, tag: "1728x1117" },
  ] as const;

  for (const { w, h, tag } of risky) {
    test(`dashboard-manager-${tag}`, async ({ page }) => {
      await setViewport(page, w, h);
      await bootDashboardManager(page, "light");
      await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
      await expect(page).toHaveScreenshot(`01-dashboard-manager-${tag}.png`, SHOT);
    });

    test(`performance-overview-${tag}`, async ({ page }) => {
      await setViewport(page, w, h);
      await bootMetrio(page, "lead");
      await expect(page).toHaveScreenshot(`04-performance-overview-${tag}.png`, SHOT);
    });

    test(`delivery-risk-${tag}`, async ({ page }) => {
      await setViewport(page, w, h);
      await bootMetrio(page, "lead");
      await clickSubnav(page, /^delivery risk$/i);
      await expect(page).toHaveScreenshot(`07-delivery-risk-${tag}.png`, SHOT);
    });

    test(`notifications-${tag}`, async ({ page }) => {
      await setViewport(page, w, h);
      await bootNotifications(page, "light");
      await page.getByRole("button", { name: /Notifications, 6 unread/i }).click();
      await expect(page).toHaveScreenshot(`20-notifications-${tag}.png`, SHOT);
    });
  }
});

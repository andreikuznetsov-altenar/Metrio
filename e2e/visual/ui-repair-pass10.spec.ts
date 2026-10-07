import { expect, test, type Page } from "@playwright/test";
import {
  bootConnected,
  bootDashboardManager,
  bootMetrio,
  bootMetrioFeedback,
  bootNotifications,
  clickSettingsSection,
  openFirstAttentionPerson,
  openPerformanceFromHome,
  serializeOnboardingChecklistVisualFixtureForPlaywright,
  serializeFeedbackDeliveryVisualSurveyForPlaywright,
  serializeFeedbackVisualPrefsForPlaywright,
  setViewport,
} from "./visualBoot";

const SHOT = { maxDiffPixelRatio: 0.02 };

async function openSettingsConnections(page: Page) {
  await page.getByRole("button", { name: /^settings$/i }).click();
  await clickSettingsSection(page, /^connections$/i);
}

async function screenshotDashboardSortHeader(
  page: Page,
  tabName: RegExp,
  testId: string,
  snapshotBase: string,
) {
  await page.getByRole("tab", { name: tabName }).click();
  const panel = page.getByTestId(testId);
  await expect(panel).toBeVisible();
  const workHeader = panel
    .getByTestId("dashboard-action-queue")
    .locator("thead th")
    .first()
    .getByRole("button");
  await expect(workHeader).toHaveScreenshot(`${snapshotBase}-sort-none.png`, SHOT);
  await workHeader.click();
  await expect(workHeader).toHaveScreenshot(`${snapshotBase}-sort-asc.png`, SHOT);
  await workHeader.click();
  await expect(workHeader).toHaveScreenshot(`${snapshotBase}-sort-desc.png`, SHOT);
}

test.describe("UI Repair Pass 10 visual acceptance", () => {
  test("dashboard-attention-table", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await expect(page.getByTestId("dashboard-attention-now")).toHaveScreenshot(
      "dashboard-attention-table.png",
      SHOT,
    );
  });

  test("dashboard-my-focus-sort-none", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /team actions/i }).click();
    const workHeader = page
      .getByTestId("dashboard-tab-team")
      .getByTestId("dashboard-action-queue")
      .locator("thead th")
      .first()
      .getByRole("button");
    await expect(workHeader).toHaveScreenshot("dashboard-my-focus-sort-none.png", SHOT);
  });

  test("dashboard-my-focus-sort-asc", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /team actions/i }).click();
    const workHeader = page
      .getByTestId("dashboard-tab-team")
      .getByTestId("dashboard-action-queue")
      .locator("thead th")
      .first()
      .getByRole("button");
    await workHeader.click();
    await expect(workHeader).toHaveScreenshot("dashboard-my-focus-sort-asc.png", SHOT);
  });

  test("dashboard-my-focus-sort-desc", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /team actions/i }).click();
    const workHeader = page
      .getByTestId("dashboard-tab-team")
      .getByTestId("dashboard-action-queue")
      .locator("thead th")
      .first()
      .getByRole("button");
    await workHeader.click();
    await workHeader.click();
    await expect(workHeader).toHaveScreenshot("dashboard-my-focus-sort-desc.png", SHOT);
  });

  test("dashboard-team-actions-alignment", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.getByRole("tab", { name: /team actions/i }).click();
    await expect(page.getByTestId("dashboard-tab-team")).toHaveScreenshot(
      "dashboard-team-actions-alignment.png",
      SHOT,
    );
  });

  test("dashboard-capacity-delivery-row", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await expect(page.getByTestId("dashboard-capacity-delivery-row")).toHaveScreenshot(
      "dashboard-capacity-delivery-row.png",
      SHOT,
    );
  });

  test("dashboard-lower-three-cards", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await expect(page.getByTestId("dashboard-lower-three-cards")).toHaveScreenshot(
      "dashboard-lower-three-cards.png",
      SHOT,
    );
  });

  test("dashboard-recommendations", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await expect(page.getByTestId("dashboard-recommendations")).toHaveScreenshot(
      "dashboard-recommendations.png",
      SHOT,
    );
  });

  test("performance-team-workload-alignment", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await expect(page.locator(".performance-table--team-workload")).toHaveScreenshot(
      "performance-team-workload-alignment.png",
      SHOT,
    );
  });

  test("person-attention-signals-alignment", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openFirstAttentionPerson(page);
    await expect(page.getByTestId("attention-signals-table")).toHaveScreenshot(
      "person-attention-signals-alignment.png",
      SHOT,
    );
  });

  test("task-list-modal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await page.addInitScript(() => {
      localStorage.setItem("metrio-visual-visualDashboardTaskModal", "1");
    });
    await bootConnected(page, "lead");
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("tab", { name: /team actions/i }).click();
    await expect(page.getByRole("button", { name: /show \d+ tasks/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /show \d+ tasks/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveScreenshot("task-list-modal.png", SHOT);
  });

  test("drawer-header-actions", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await page.getByRole("button", { name: /View person/i }).first().click();
    await expect(page.locator(".drawer__header")).toHaveScreenshot(
      "drawer-header-actions.png",
      SHOT,
    );
  });

  test("drawer-header-onboarding", async ({ page }) => {
    const onboardingJson = serializeOnboardingChecklistVisualFixtureForPlaywright();
    await page.addInitScript((payload: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "employee");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-onboarding-checklist", payload);
    }, onboardingJson);
    await setViewport(page, 1440, 900);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "View checklist" }).click();
    await expect(page.getByTestId("onboarding-checklist-drawer")).toBeVisible();
    await expect(page.locator(".drawer__header")).toHaveScreenshot(
      "drawer-header-onboarding.png",
      SHOT,
    );
  });

  test("feedback-history-neutral-selection", async ({ page }) => {
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
    await setViewport(page, 1440, 900);
    await page.goto("/");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /^feedback$/i }).click();
    await page.getByRole("button", { name: /^History$/i }).click();
    await expect(page.getByTestId("feedback-history-table")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-history-table")).toHaveScreenshot(
      "feedback-history-neutral-selection.png",
      SHOT,
    );
  });

  test("search-open-neutral-border", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    await page.keyboard.press("Meta+k");
    await expect(page.getByTestId("command-palette")).toBeVisible();
    await expect(page.getByTestId("command-palette")).toHaveScreenshot(
      "search-open-neutral-border.png",
      SHOT,
    );
  });

  test("connections-google-flat-card", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page, "lead");
    await openSettingsConnections(page);
    await expect(page.getByTestId("settings-google-card")).toHaveScreenshot(
      "connections-google-flat-card.png",
      SHOT,
    );
  });

  test("filter-select-open", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await page.getByLabel("Date range preset").click();
    await expect(page.locator(".select-content")).toBeVisible();
    await expect(page.locator(".performance-toolbar")).toHaveScreenshot(
      "filter-select-open.png",
      SHOT,
    );
  });

  test("filter-date-open", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await page.getByRole("button", { name: /^From date,/i }).click();
    await expect(page.locator(".metrio-date-picker__popover")).toBeVisible();
    await expect(page.locator(".performance-toolbar")).toHaveScreenshot(
      "filter-date-open.png",
      SHOT,
    );
  });

  test("capacity-insufficient-history", async ({ page }) => {
    await page.addInitScript((fixtureId: string) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", "light");
    }, "lead");
    await page.goto("/?visualInsufficientHistory=1");
    await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
    await openPerformanceFromHome(page);
    await expect(page.getByTestId("visual-insufficient-history-card")).toHaveScreenshot(
      "capacity-insufficient-history.png",
      SHOT,
    );
  });

  test("capacity-distribution-insufficient-history", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootDashboardManager(page);
    const capacityPanel = page.getByTestId("dashboard-capacity-delivery-row").locator(
      ".executive-panel",
    ).first();
    await expect(capacityPanel).toHaveScreenshot(
      "capacity-distribution-insufficient-history.png",
      SHOT,
    );
  });

  test("drawer-notifications-header", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootNotifications(page);
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(page.locator(".drawer__header")).toHaveScreenshot(
      "drawer-header-notifications-pass10.png",
      SHOT,
    );
  });
});

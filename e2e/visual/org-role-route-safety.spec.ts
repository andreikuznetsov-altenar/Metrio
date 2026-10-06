import { test, expect } from "@playwright/test";
import {
  bootOrgRoleScenario,
  setViewport,
} from "./visualBoot";
import { serializeOrgRoleScenarioPrefsForPlaywright } from "../../src/fixtures/orgRoleProductionPathFixture";
import { PREFERENCES_SAVED_EVENT } from "../../src/platform/preferences";

test.describe("ORG Pass 12 route safety", () => {
  test("IC cannot open survey management tab", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootOrgRoleScenario(page, "ic");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("metrio-navigate-route", { detail: "feedback" }));
      window.dispatchEvent(
        new CustomEvent("metrio-open-feedback-tab", { detail: "survey" }),
      );
    });
    await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
    await expect(page.getByTestId("feedback-ic-results-only")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("feedback-tab-panel-survey")).toHaveCount(0);
  });

  test("leaf manager can open survey tab", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootOrgRoleScenario(page, "leaf");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
    await expect(page.getByTestId("feedback-tab-panel-survey")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("manager of managers has no Feedback navigation", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootOrgRoleScenario(page, "mom");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }),
    ).toHaveCount(0);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("metrio-navigate-route", { detail: "feedback" }));
      window.dispatchEvent(
        new CustomEvent("metrio-open-feedback-tab", { detail: "survey" }),
      );
    });
    await expect(page.getByTestId("feedback-tab-panel-survey")).toHaveCount(0);
  });

  test("leaf manager loses survey route after role becomes manager of managers", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    await bootOrgRoleScenario(page, "leaf");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
    await expect(page.getByTestId("feedback-tab-panel-survey")).toBeVisible({
      timeout: 30_000,
    });
    const momPrefs = serializeOrgRoleScenarioPrefsForPlaywright("mom");
    await page.evaluate(
      ({ prefs, eventName }) => {
        localStorage.setItem("metrio-org-role-scenario", "mom");
        localStorage.setItem("metrio-visual-preferences", prefs);
        window.dispatchEvent(
          new CustomEvent(eventName, { detail: JSON.parse(prefs) }),
        );
      },
      { prefs: momPrefs, eventName: PREFERENCES_SAVED_EVENT },
    );
    await expect(page.getByTestId("feedback-tab-panel-survey")).toHaveCount(0);
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("manager of managers does not auto-open survey when becoming leaf manager", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    await bootOrgRoleScenario(page, "mom");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    const leafPrefs = serializeOrgRoleScenarioPrefsForPlaywright("leaf");
    await page.evaluate(
      ({ prefs, eventName }) => {
        localStorage.setItem("metrio-org-role-scenario", "leaf");
        localStorage.setItem("metrio-visual-preferences", prefs);
        window.dispatchEvent(
          new CustomEvent(eventName, { detail: JSON.parse(prefs) }),
        );
      },
      { prefs: leafPrefs, eventName: PREFERENCES_SAVED_EVENT },
    );
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("feedback-tab-panel-survey")).toHaveCount(0);
    await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
    await expect(page.getByTestId("feedback-tab-panel-survey")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("command palette hides survey shortcut for IC", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootOrgRoleScenario(page, "ic");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Meta+k");
    await page.getByPlaceholder(/search/i).fill("survey");
    await expect(
      page.locator(".command-palette__item").filter({ hasText: "Surveys and delivery" }),
    ).toHaveCount(0);
  });
});

import { expect, type Page } from "@playwright/test";
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
import { serializeCalendarVisualFixtureForPlaywright } from "../../src/fixtures/calendarVisualFixture";
import {
  VISUAL_DASHBOARD_CACHE_STORAGE_KEY,
  VISUAL_PERFORMANCE_DELAY_MS_KEY,
  VISUAL_PERFORMANCE_FAIL_KEY,
} from "../../src/fixtures/dashboardCacheVisualFixture";
import { OPEN_RESOURCES_EVENT } from "../../src/platform/openOnboardingResource";
import {
  ORG_ROLE_PRODUCTION_PATH_KEY,
  ORG_ROLE_SCENARIO_STORAGE_KEY,
  serializeOrgRoleScenarioPrefsForPlaywright,
  type OrgRoleScenarioId,
} from "../../src/fixtures/orgRoleProductionPathFixture";

/** Cleared on each boot unless a test explicitly seeds dashboard-cache visuals. */
export const VISUAL_EPHEMERAL_STORAGE_KEYS = [
  VISUAL_DASHBOARD_CACHE_STORAGE_KEY,
  VISUAL_PERFORMANCE_DELAY_MS_KEY,
  VISUAL_PERFORMANCE_FAIL_KEY,
];

export type BootDashboardOptions = {
  theme?: "light" | "dark";
  width?: number;
  /** Seeds goals through loadGoalsDataLocal / metrio-visual-goals. */
  goals?: boolean;
  performanceRefreshDelayMs?: number;
  visualGroupedTasks?: boolean;
  visualCapacityInsufficientAll?: boolean;
};

export async function setViewport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
}

export async function openPerformanceFromHome(page: Page) {
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  await page.locator(".app-header__nav-link").filter({ hasText: "Performance" }).click();
  await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
    timeout: 30_000,
  });
}

export async function bootOrgRoleScenario(
  page: Page,
  scenario: OrgRoleScenarioId,
  options?: { theme?: "light" | "dark"; width?: number },
) {
  const theme = options?.theme ?? "light";
  if (options?.width) {
    await setViewport(page, options.width, 900);
  }
  const prefsJson = serializeOrgRoleScenarioPrefsForPlaywright(scenario);
  const devFixture =
    scenario === "ic"
      ? "employee"
      : scenario === "leaf"
        ? "lead"
        : "director";
  await page.addInitScript(
    ({
      scenarioId,
      prefs,
      fixtureId,
      themeId,
      ephemeralKeys,
    }: {
      scenarioId: string;
      prefs: string;
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
      localStorage.setItem("metrio-org-role-production-path", "1");
      localStorage.setItem("metrio-org-role-scenario", scenarioId);
      localStorage.setItem("metrio-visual-preferences", prefs);
    },
    {
      scenarioId: scenario,
      prefs: prefsJson,
      fixtureId: devFixture,
      themeId: theme,
      ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS],
    },
  );
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
}

export async function openFeedbackTab(
  page: Page,
  tab: "survey" | "results" | "delivery" | "history",
) {
  await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
  await page.getByTestId(`feedback-tab-panel-${tab}`).waitFor({ state: "visible", timeout: 30_000 }).catch(() => undefined);
}

export async function bootConnected(
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

export async function bootDashboardManager(
  page: Page,
  options?: "light" | "dark" | BootDashboardOptions,
) {
  const opts: BootDashboardOptions =
    options === "light" || options === "dark" || options == null
      ? { theme: options ?? "light" }
      : options;
  if (opts.width) {
    await setViewport(page, opts.width, 900);
  }
  const goalsJson = opts.goals ? serializeGoalsVisualFixtureForPlaywright() : null;
  await page.addInitScript(
    ({
      fixtureId,
      themeId,
      ephemeralKeys,
      goals,
      refreshDelayMs,
      groupedTasks,
      capacityInsufficientAll,
    }: {
      fixtureId: string;
      themeId: string;
      ephemeralKeys: string[];
      goals: string | null;
      refreshDelayMs?: number;
      groupedTasks?: boolean;
      capacityInsufficientAll?: boolean;
    }) => {
      for (const key of ephemeralKeys) {
        localStorage.removeItem(key);
      }
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", fixtureId);
      localStorage.setItem("metrio-theme", themeId);
      if (goals) {
        localStorage.setItem("metrio-visual-goals", goals);
      }
      if (refreshDelayMs != null && refreshDelayMs > 0) {
        localStorage.setItem("metrio-visual-performance-delay-ms", String(refreshDelayMs));
      }
      if (groupedTasks) {
        localStorage.setItem("metrio-visual-visualGroupedTasks", "1");
      }
      if (capacityInsufficientAll) {
        localStorage.setItem("metrio-visual-visualCapacityInsufficientAll", "1");
      }
    },
    {
      fixtureId: "lead",
      themeId: opts.theme ?? "light",
      ephemeralKeys: [...VISUAL_EPHEMERAL_STORAGE_KEYS],
      goals: goalsJson,
      refreshDelayMs: opts.performanceRefreshDelayMs,
      groupedTasks: opts.visualGroupedTasks,
      capacityInsufficientAll: opts.visualCapacityInsufficientAll,
    },
  );
  await page.goto("/");
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
}

export async function bootMetrio(page: Page, fixture: "lead" | "employee" = "lead") {
  await bootConnected(page, fixture, "light");
  await openPerformanceFromHome(page);
}

export async function bootMetrioWithFlags(
  page: Page,
  flags: { groupedTasks?: boolean; capacityInsufficientAll?: boolean } = {},
) {
  await page.addInitScript(
    ({ groupedTasks, capacityInsufficientAll }: { groupedTasks?: boolean; capacityInsufficientAll?: boolean }) => {
      if (groupedTasks) {
        localStorage.setItem("metrio-visual-visualGroupedTasks", "1");
      }
      if (capacityInsufficientAll) {
        localStorage.setItem("metrio-visual-visualCapacityInsufficientAll", "1");
      }
    },
    flags,
  );
  await bootMetrio(page);
}

export async function clickSubnav(page: Page, label: RegExp) {
  await page.locator(".performance-subnav").getByRole("button", { name: label }).click();
  await page.waitForTimeout(120);
}

export async function clickSettingsSection(page: Page, label: RegExp) {
  await page
    .locator('.settings-layout nav[aria-label="Settings sections"]')
    .getByRole("button", { name: label })
    .click();
  await page.waitForTimeout(120);
}

export async function openFirstAttentionPerson(page: Page) {
  const row = page.locator(".performance-table--attention tbody tr").first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
}

export async function expectPerformanceTab(page: Page, label: RegExp) {
  const btn = page.locator(".performance-subnav").getByRole("button", { name: label });
  await expect(btn).toHaveClass(/is-active/, { timeout: 15_000 });
}

export async function assertTableHeadersNowrap(page: Page, tableSelector: string) {
  const nowrap = await page.locator(`${tableSelector} thead th`).evaluateAll((cells) =>
    cells.every((cell) => window.getComputedStyle(cell).whiteSpace === "nowrap"),
  );
  expect(nowrap).toBe(true);
}

/** Opens Resource Library via the supported app event (Dashboard 2.0 has no CTA). */
export async function openResourceLibrary(page: Page) {
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName));
  }, OPEN_RESOURCES_EVENT);
  await expect(page.getByTestId("resource-library")).toBeVisible({ timeout: 15_000 });
}

export async function bootGoalsVisual(
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
  await openPerformanceFromHome(page);
  await page.locator(".performance-subnav").getByRole("button", { name: /^Goals$/i }).click();
}

export async function bootMetrioFeedback(page: Page, theme: "light" | "dark" = "light") {
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

export async function bootFeedbackDisconnected(page: Page, theme: "light" | "dark" = "light") {
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
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
}

export async function bootNotifications(page: Page, theme: "light" | "dark" = "light") {
  const eventsJson = serializeNotificationFixtureForPlaywright();
  await page.addInitScript(
    ({ payload, themeId }: { payload: string; themeId: string }) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", themeId);
      localStorage.setItem("metrio-notification-events", payload);
    },
    { payload: eventsJson, themeId: theme },
  );
  await page.goto("/");
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
}

export async function bootDigestWeeklyDrawer(page: Page) {
  const prefsJson = serializeDigestVisualPrefsForPlaywright();
  await page.addInitScript(
    ({ prefs }: { prefs: string }) => {
      localStorage.setItem("metrio-connection-connected", "true");
      localStorage.setItem("metrio-dev-fixture", "lead");
      localStorage.setItem("metrio-theme", "light");
      localStorage.setItem("metrio-visual-preferences", prefs);
    },
    { prefs: prefsJson },
  );
  await page.goto("/");
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /open weekly digest/i }).click();
  await expect(page.locator(".drawer--digest")).toBeVisible({ timeout: 15_000 });
}

export {
  serializeFeedbackCyclesPopulatedSurveyForPlaywright,
  serializeFeedbackDeliveryVisualSurveyForPlaywright,
  serializeOnboardingChecklistVisualFixtureForPlaywright,
  serializeCalendarVisualFixtureForPlaywright,
  serializeFeedbackVisualPrefsForPlaywright,
};

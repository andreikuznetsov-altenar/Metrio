import { test, expect } from "@playwright/test";
import {
  bootConnected,
  bootOrgRoleScenario,
  openPerformanceFromHome,
  setViewport,
} from "./visualBoot";

test.describe("ORG Pass 12 IC", () => {
  test("org-role-ic-dashboard", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootOrgRoleScenario(page, "ic");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-director-team-health")).toHaveCount(0);
  });

  test("org-role-ic-manager-card", async ({ page }) => {
    await bootOrgRoleScenario(page, "ic");
    await expect(page.getByTestId("dashboard-your-manager")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("org-role-ic-performance-self", async ({ page }) => {
    await bootOrgRoleScenario(page, "ic");
    await openPerformanceFromHome(page);
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("leadership-branches-performance")).toHaveCount(0);
  });

  test("org-role-ic-feedback-results-only", async ({ page }) => {
    await bootOrgRoleScenario(page, "ic");
    await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
    await expect(page.getByTestId("feedback-ic-results-only")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("feedback-v2-page")).toHaveCount(0);
  });
});

test.describe("ORG Pass 12 leaf manager", () => {
  test("org-role-leaf-manager-dashboard", async ({ page }) => {
    await bootOrgRoleScenario(page, "leaf");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-direct-ic-note")).toHaveCount(0);
  });

  test("org-role-leaf-manager-performance", async ({ page }) => {
    await bootOrgRoleScenario(page, "leaf");
    await openPerformanceFromHome(page);
    await expect(page.getByTestId("team-people-view")).toHaveCount(0);
    await page.locator(".performance-subnav__link").filter({ hasText: "People" }).click();
    await expect(page.getByTestId("team-people-view")).toBeVisible();
  });

  test("org-role-leaf-manager-direct-team-only", async ({ page }) => {
    await bootOrgRoleScenario(page, "leaf");
    await expect(page.getByTestId("dashboard-director-team-health")).toHaveCount(0);
  });
});

test.describe("ORG Pass 12 manager of managers", () => {
  test("org-role-manager-of-managers-dashboard", async ({ page }) => {
    await bootOrgRoleScenario(page, "mom");
    await expect(page.getByTestId("dashboard-director-team-health")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("org-role-manager-of-managers-performance", async ({ page }) => {
    await bootOrgRoleScenario(page, "mom");
    await openPerformanceFromHome(page);
    await page.locator(".performance-subnav__link").filter({ hasText: "Teams" }).click();
    await expect(page.getByTestId("leadership-branches-performance")).toBeVisible();
  });

  test("org-role-manager-of-managers-no-survey", async ({ page }) => {
    await bootOrgRoleScenario(page, "mom");
    await expect(
      page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }),
    ).toHaveCount(0);
  });

  test("org-role-manager-of-managers-branch-first People", async ({ page }) => {
    await bootOrgRoleScenario(page, "mom");
    await openPerformanceFromHome(page);
    await page.locator(".performance-subnav__link").filter({ hasText: "People" }).click();
    await expect(page.getByTestId("leadership-branches-people")).toBeVisible();
    await expect(page.getByTestId("team-people-view")).toHaveCount(0);
  });

  test("org-role-manager-of-managers-direct-ic-note mixed", async ({ page }) => {
    await bootOrgRoleScenario(page, "mixed");
    await expect(page.getByTestId("dashboard-direct-ic-note")).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("ORG Pass 12 hierarchy", () => {
  test("org-role-deep-hierarchy primary branch", async ({ page }) => {
    await bootOrgRoleScenario(page, "deep");
    await expect(page.getByTestId("dashboard-director-team-health")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("person-06")).toBeVisible();
    await expect(page.getByText("person-08", { exact: true })).toHaveCount(0);
  });

  test("org-role-mixed-direct-reports", async ({ page }) => {
    await bootOrgRoleScenario(page, "mixed");
    await expect(page.getByTestId("dashboard-director-team-health")).toBeVisible();
    await expect(page.getByText("person-06")).toBeVisible();
  });
});

test.describe("ORG Pass 12 aggregation UI", () => {
  test("org-role-branch-capacity", async ({ page }) => {
    await bootOrgRoleScenario(page, "branch-capacity");
    await openPerformanceFromHome(page);
    await page.locator(".performance-subnav__link").filter({ hasText: "Teams" }).click();
    const table = page.getByTestId("leadership-branches-performance");
    await expect(table).toBeVisible();
    await expect(table.getByText(/Heavy|no history|measured/i).first()).toBeVisible();
    await expect(table.getByText(/64%/)).toHaveCount(0);
  });

  test("org-role-branch-recommendations", async ({ page }) => {
    await bootOrgRoleScenario(page, "branch-recommendations");
    await expect(page.getByTestId("dashboard-recommendations")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("dashboard-recommendations")).not.toContainText("Jane");
  });
});

test.describe("ORG Pass 12 dark", () => {
  test("org-role-dark-ic", async ({ page }) => {
    await bootOrgRoleScenario(page, "ic", { theme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByTestId("dashboard-your-manager")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("org-role-dark-leaf-manager", async ({ page }) => {
    await bootOrgRoleScenario(page, "leaf", { theme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
  });

  test("org-role-dark-manager-of-managers", async ({ page }) => {
    await bootOrgRoleScenario(page, "mom", { theme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByTestId("dashboard-director-team-health")).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("ORG Pass 12 responsive MoM", () => {
  for (const width of [1280, 1440, 1728]) {
    test(`org-role-manager-of-managers-${width}`, async ({ page }) => {
      await bootOrgRoleScenario(page, "mom", { width });
      await expect(page.getByTestId("dashboard-director-team-health")).toBeVisible({
        timeout: 30_000,
      });
      await openPerformanceFromHome(page);
      await page.locator(".performance-subnav__link").filter({ hasText: "Teams" }).click();
      await expect(page.getByTestId("leadership-branches-performance")).toBeVisible();
    });
  }
});

test.describe("ORG Pass 12 legacy dev fixtures", () => {
  test("leaf manager dashboard shows team scope without leadership branch note", async ({
    page,
  }) => {
    await setViewport(page, 1440, 900);
    await bootConnected(page, "lead");
    await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("dashboard-direct-ic-note")).toHaveCount(0);
  });
});

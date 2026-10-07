import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import {
  bootOrgRoleScenario,
  clickSubnav,
  openPerformanceFromHome,
  setViewport,
} from "./visualBoot";

const VIEWPORT = { width: 1440, height: 900 };
const OUT_ROOT = join(process.cwd(), "artifacts/pass13-role-review");

type RolePack = {
  id: string;
  scenario: "ic" | "leaf" | "mom";
  shots: Array<{ name: string; capture: (page: import("@playwright/test").Page) => Promise<void> }>;
};

const ROLES: RolePack[] = [
  {
    id: "individual-contributor",
    scenario: "ic",
    shots: [
      {
        name: "01-dashboard",
        capture: async (page) => {
          await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        name: "02-performance-self",
        capture: async (page) => {
          await openPerformanceFromHome(page);
        },
      },
      {
        name: "03-feedback-results",
        capture: async (page) => {
          await page.locator(".app-header__nav-link").filter({ hasText: "Feedback" }).click();
          await expect(page.getByTestId("feedback-ic-results-only")).toBeVisible({
            timeout: 15_000,
          });
        },
      },
    ],
  },
  {
    id: "leaf-manager",
    scenario: "leaf",
    shots: [
      {
        name: "01-dashboard",
        capture: async (page) => {
          await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        name: "02-team-workload",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await clickSubnav(page, /^overview$/i);
          await expect(page.locator(".performance-table--team-workload")).toBeVisible();
        },
      },
      {
        name: "03-team-attention",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await clickSubnav(page, /^overview$/i);
          await expect(page.getByTestId("team-attention-row").first()).toBeVisible({
            timeout: 15_000,
          });
        },
      },
      {
        name: "04-delivery-risk",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await clickSubnav(page, /delivery risk/i);
          await expect(page.locator(".performance-table--delivery-risk")).toBeVisible();
        },
      },
      {
        name: "05-people",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await clickSubnav(page, /^people$/i);
          await expect(page.getByTestId("team-people-view")).toBeVisible();
        },
      },
    ],
  },
  {
    id: "manager-of-managers",
    scenario: "mom",
    shots: [
      {
        name: "01-dashboard",
        capture: async (page) => {
          await expect(page.getByTestId("dashboard-director-team-health")).toBeVisible({
            timeout: 30_000,
          });
        },
      },
      {
        name: "02-performance-teams",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await page.locator(".performance-subnav__link").filter({ hasText: "Teams" }).click();
          await expect(page.getByTestId("leadership-branches-performance")).toBeVisible();
        },
      },
      {
        name: "03-signals",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await page.locator(".performance-subnav__link").filter({ hasText: "Signals" }).click();
          await expect(
            page.getByTestId("director-signals").or(page.getByTestId("director-signals-empty")),
          ).toBeVisible({ timeout: 15_000 });
        },
      },
      {
        name: "04-delivery",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await page.locator(".performance-subnav__link").filter({ hasText: "Delivery" }).click();
          await expect(page.getByTestId("director-delivery")).toBeVisible({ timeout: 15_000 });
        },
      },
      {
        name: "05-overview",
        capture: async (page) => {
          await openPerformanceFromHome(page);
          await page.locator(".performance-subnav__link").filter({ hasText: "Overview" }).click();
          await expect(page.getByTestId("director-overview")).toBeVisible({ timeout: 15_000 });
        },
      },
    ],
  },
];

test.describe("Pass 13.6 role review screenshot pack", () => {
  for (const role of ROLES) {
    test.describe(role.id, () => {
      for (const shot of role.shots) {
        test(shot.name, async ({ page }) => {
          const dir = join(OUT_ROOT, role.id);
          await mkdir(dir, { recursive: true });
          await setViewport(page, VIEWPORT.width, VIEWPORT.height);
          await bootOrgRoleScenario(page, role.scenario, { width: VIEWPORT.width });
          await shot.capture(page);
          await page.screenshot({
            path: join(dir, `${shot.name}.png`),
            fullPage: true,
            animations: "disabled",
          });
        });
      }
    });
  }
});

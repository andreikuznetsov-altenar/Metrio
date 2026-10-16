import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { buildDocBambooGoals } from "../../src/fixtures/docFixtureData";
import {
  bootOrgRoleScenario,
  openPerformanceFromHome,
  bootMetrio,
  clickSubnav,
  openDirectReportPersonBrief,
  openFirstAttentionPerson,
  setViewport,
} from "./visualBoot";

const HEIGHTS = [600, 700, 760, 900] as const;
/** Canonical drawer body bottom padding (var(--drawer-body-padding)) plus rounding slack. */
const BOTTOM_INSET_MAX = 28;

type Geometry = {
  client: number;
  scroll: number;
  scrollTop: number;
  contentBottom: number;
  trailing: number;
  scrolls: boolean;
};

/** Geometry of the visible drawer body: real scroll extent vs. the last visible content element. */
async function geometry(page: Page, drawer = ".drawer"): Promise<Geometry> {
  return page.evaluate((selector) => {
    const bodies = [...document.querySelectorAll(`${selector} .drawer__body`)] as HTMLElement[];
    const body = bodies.find((b) => b.getBoundingClientRect().width > 0)!;
    const box = body.getBoundingClientRect();
    let contentBottom = 0;
    body.querySelectorAll("*").forEach((node) => {
      const el = node as HTMLElement;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (getComputedStyle(el).visibility === "hidden") return;
      contentBottom = Math.max(contentBottom, r.bottom - box.top + body.scrollTop);
    });
    return {
      client: body.clientHeight,
      scroll: body.scrollHeight,
      scrollTop: body.scrollTop,
      contentBottom: Math.round(contentBottom),
      trailing: Math.round(body.scrollHeight - contentBottom),
      scrolls: body.scrollHeight > body.clientHeight + 1,
    };
  }, drawer);
}

/** Short content never scrolls; long content scrolls only as far as its last element + canonical inset. */
function expectCanonical(g: Geometry, label: string) {
  if (!g.scrolls) {
    expect(g.scroll, `${label}: short content must not scroll`).toBeLessThanOrEqual(g.client + 1);
    return;
  }
  expect(g.trailing, `${label}: blank scroll area after the last element`).toBeLessThanOrEqual(BOTTOM_INSET_MAX);
  expect(g.trailing, `${label}: content must be reachable`).toBeGreaterThanOrEqual(-1);
}

async function scrollBodyToEnd(page: Page, drawer: string) {
  await page.evaluate((selector) => {
    const bodies = [...document.querySelectorAll(`${selector} .drawer__body`)] as HTMLElement[];
    const body = bodies.find((b) => b.getBoundingClientRect().width > 0)!;
    body.scrollTop = body.scrollHeight;
  }, drawer);
}

test.describe("PASS 28 drawer scroll geometry", () => {
  for (const height of HEIGHTS) {
    test(`Person drawer tabs: long → short → long @ ${height}`, async ({ page }) => {
      await setViewport(page, 1440, height);
      await bootMetrio(page);
      await openFirstAttentionPerson(page);
      const drawer = ".drawer--person-detail";
      await expect(page.locator(drawer)).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(500);

      const overview = await geometry(page, drawer);
      expectCanonical(overview, "Overview");

      await scrollBodyToEnd(page, drawer);
      await page.locator(drawer).getByRole("tab", { name: "Work" }).click();
      await page.waitForTimeout(450);
      const work = await geometry(page, drawer);
      expectCanonical(work, "Work after Overview");
      expect(work.scrollTop, "switching to a short tab must not keep the old scroll offset").toBe(0);

      await page.locator(drawer).getByRole("tab", { name: "History" }).click();
      await page.waitForTimeout(450);
      expectCanonical(await geometry(page, drawer), "History");

      await page.locator(drawer).getByRole("tab", { name: "Overview" }).click();
      await page.waitForTimeout(450);
      const again = await geometry(page, drawer);
      expectCanonical(again, "Overview again");
      expect(again.scrolls, "short → long restores required scrolling").toBe(overview.scrolls);
    });

    test(`Person Brief (factual summary footer) ends with the canonical inset @ ${height}`, async ({ page }) => {
      await setViewport(page, 1440, height);
      await bootMetrio(page);
      await openDirectReportPersonBrief(page);
      await page.waitForTimeout(700);
      const drawer = ".drawer--person-detail";
      const before = await geometry(page, drawer);
      expectCanonical(before, "Brief");
      // regression: the inactive Profile view used to add ~195px of blank scroll area here
      if (before.scrolls) {
        await scrollBodyToEnd(page, drawer);
        await page.waitForTimeout(600); // drawer bodies use smooth scrolling
      }
      const gap = await page.evaluate((selector) => {
        const bodies = [...document.querySelectorAll(`${selector} .drawer__body`)] as HTMLElement[];
        const body = bodies.find((b) => b.getBoundingClientRect().width > 0)!;
        const note = body.querySelector(".person-brief__footer-note") as HTMLElement;
        return Math.round(body.getBoundingClientRect().bottom - note.getBoundingClientRect().bottom);
      }, drawer);
      expect(gap, "factual-summary note is reachable").toBeGreaterThanOrEqual(0);
      if (before.scrolls) {
        expect(gap, "nothing but the canonical inset follows the note").toBeLessThanOrEqual(BOTTOM_INSET_MAX);
      }
    });

    test(`Brief → Profile Work: hidden views add no scroll height @ ${height}`, async ({ page }) => {
      await setViewport(page, 1440, height);
      await bootMetrio(page);
      await openDirectReportPersonBrief(page);
      await page.waitForTimeout(600);
      const drawer = ".drawer--person-detail";
      await page.locator(drawer).getByRole("button", { name: "Profile" }).first().click();
      await page.waitForTimeout(500);
      await page.locator(drawer).getByRole("tab", { name: "Work" }).click();
      await page.waitForTimeout(450);
      const work = await geometry(page, drawer);
      // UX requirement: hidden views add no scroll height, nothing is clipped, and the panel
      // scrolls only when its own (visible) content really overflows. Longer legitimate content
      // (e.g. Task Health's Problematic tasks) may scroll; a short Work list never may.
      expectCanonical(work, "Work after Brief");
      // no clipped content: the last visible element is inside the scrollable extent
      expect(work.contentBottom, "no clipped content").toBeLessThanOrEqual(work.scroll + 1);
      if (work.scrolls) {
        // scrollbar is earned: visible content + the canonical inset exceeds the viewport...
        expect(work.contentBottom + BOTTOM_INSET_MAX, "scrollbar without overflowing content").toBeGreaterThan(work.client);
        // ...and nothing but that inset follows the last element (no blank scroll area)
        expect(work.trailing, "blank scroll area left by a hidden view").toBeLessThanOrEqual(BOTTOM_INSET_MAX);
      } else {
        // short content: fits, and no internal scrollbar at all
        expect(work.contentBottom, "short Work panel overflows without scrolling").toBeLessThanOrEqual(work.client + 1);
        expect(work.scroll, "short Work panel must not scroll").toBeLessThanOrEqual(work.client + 1);
      }
    });

    test(`Task journey drawer @ ${height}`, async ({ page }) => {
      await setViewport(page, 1440, height);
      await bootMetrio(page);
      await clickSubnav(page, /^overview$/i);
      await page.getByTestId("team-attention-row").getByTestId("grouped-issue-count-link").first().click();
      await page.getByTestId("task-list-info").first().click();
      await expect(page.getByTestId("task-journey-drawer")).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(600);
      expectCanonical(await geometry(page, ".task-journey-drawer"), "Task journey");
    });

    test(`Project cockpit drawer @ ${height}`, async ({ page }) => {
      await setViewport(page, 1440, height);
      await bootMetrio(page);
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent("metrio-open-project-cockpit", { detail: { projectKey: "UX" } })),
      );
      await expect(page.getByTestId("project-cockpit")).toBeVisible();
      await page.waitForTimeout(600);
      expectCanonical(await geometry(page, ".drawer--project-cockpit"), "Project cockpit");
    });
  }

  for (const height of HEIGHTS) {
    test(`Goal detail drawer @ ${height}`, async ({ page }) => {
      await setViewport(page, 1440, height);
      await page.addInitScript((goals: string) => {
        localStorage.setItem("metrio-visual-bamboo-goals", goals);
      }, JSON.stringify(buildDocBambooGoals("doc-maria")));
      await bootOrgRoleScenario(page, "ic", { theme: "light" });
      await openPerformanceFromHome(page);
      await clickSubnav(page, /^goals$/i);
      await page.getByTestId("bamboo-goal-open").first().click();
      await expect(page.getByTestId("bamboo-goal-detail")).toBeVisible();
      await page.waitForTimeout(600);
      expectCanonical(await geometry(page, '[data-testid="bamboo-goal-detail-drawer"]'), "Goal detail");
    });
  }

  test("closing one drawer and opening another does not inherit scroll geometry", async ({ page }) => {
    await setViewport(page, 1440, 600);
    await bootMetrio(page);
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("metrio-open-project-cockpit", { detail: { projectKey: "UX" } })),
    );
    await expect(page.getByTestId("project-cockpit")).toBeVisible();
    await page.waitForTimeout(500);
    await scrollBodyToEnd(page, ".drawer--project-cockpit");
    await page.keyboard.press("Escape");
    await expect(page.locator(".drawer--project-cockpit")).toHaveCount(0, { timeout: 10_000 });
    await clickSubnav(page, /^overview$/i);
    await page.getByTestId("team-attention-row").getByTestId("grouped-issue-count-link").first().click();
    await page.getByTestId("task-list-info").first().click();
    await expect(page.getByTestId("task-journey-drawer")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);
    const g = await geometry(page, ".task-journey-drawer");
    expect(g.scrollTop).toBe(0);
    expectCanonical(g, "Task journey after cockpit");
  });
});

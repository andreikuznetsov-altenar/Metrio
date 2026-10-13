import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, clickSubnav, openFirstAttentionPerson, setViewport } from "./visualBoot";

const WIDTHS = [1280, 1440, 1728] as const;
const THEMES = ["light", "dark"] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

async function openTeamAttentionTaskModal(page: Page) {
  await clickSubnav(page, /^overview$/i);
  const link = page.getByTestId("team-attention-row").getByTestId("grouped-issue-count-link").first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  await link.click();
  await expect(page.getByTestId("task-list-modal")).toBeVisible();
}

test.describe("PASS 27 task surfaces", () => {
  for (const width of WIDTHS) {
    test(`Tasks modal: Info column fits and has no horizontal overflow @ ${width}`, async ({ page }) => {
      await setViewport(page, width, 900);
      await bootMetrio(page);
      await openTeamAttentionTaskModal(page);
      const modal = page.getByTestId("task-list-modal");
      const infoButtons = modal.getByTestId("task-list-info");
      await expect(infoButtons.first()).toBeVisible();
      const wrap = modal.locator(".performance-table-wrap").first();
      const overflow = await wrap.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      // every Info button is fully inside the modal (not clipped) and rows keep one height
      const modalBox = (await modal.boundingBox())!;
      const boxes = await infoButtons.evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { left: r.left, right: r.right, height: r.height };
        }),
      );
      for (const box of boxes) {
        expect(box.right).toBeLessThanOrEqual(modalBox.x + modalBox.width + 1);
        expect(box.height).toBeCloseTo(boxes[0].height, 0);
      }
      // the action header has no sort affordance
      const lastHeader = modal.getByRole("columnheader").last();
      await expect(lastHeader.locator("button")).toHaveCount(0);
    });
  }

  test("Jira key opens Jira externally, stays on the same screen and keeps the modal", async ({ page }) => {
    await setViewport(page, 1440, 900);
    await bootMetrio(page);
    await openTeamAttentionTaskModal(page);
    const modal = page.getByTestId("task-list-modal");
    const urlBefore = page.url();
    const key = modal.getByTestId("jira-issue-link").first();
    const issueKey = (await key.getAttribute("data-issue-key"))!;
    await key.click();
    const opened = await page.evaluate(
      () => (window as unknown as { __metrioLastOpenedUrl?: string }).__metrioLastOpenedUrl,
    );
    expect(opened).toContain(`/browse/${issueKey}`);
    expect(page.url()).toBe(urlBefore);
    await expect(modal).toBeVisible();
    await expect(page.getByTestId("task-journey-drawer")).toHaveCount(0);
  });

  for (const theme of THEMES) {
    test(`Info closes the modal (and its scrim) then opens the drawer; closing it does not reopen the modal (${theme})`, async ({
      page,
    }) => {
      await setViewport(page, 1440, 900);
      await bootMetrio(page);
      await setTheme(page, theme);
      await openTeamAttentionTaskModal(page);
      const modal = page.getByTestId("task-list-modal");
      await modal.getByTestId("task-list-info").first().click();
      await expect(page.getByTestId("task-journey-drawer")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("metrio-modal-root")).toHaveCount(0);
      await expect(modal).toHaveCount(0);

      await page.keyboard.press("Escape");
      await expect(page.getByTestId("task-journey-drawer")).toHaveCount(0, { timeout: 10_000 });
      await page.waitForTimeout(500);
      await expect(page.getByTestId("task-list-modal")).toHaveCount(0);
      await expect(page.getByTestId("metrio-modal-root")).toHaveCount(0);
    });
  }

  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      test(`Person drawer KPI block is a balanced 2 × 2 grid @ ${width} ${theme}`, async ({ page }) => {
        await setViewport(page, width, 900);
        await bootMetrio(page);
        await setTheme(page, theme);
        await openFirstAttentionPerson(page);
        const grid = page.locator(".drawer--person-detail .person-performance-metrics .performance-metrics--two-by-two");
        await expect(grid).toBeVisible({ timeout: 15_000 });
        const cards = grid.locator(".performance-metric-card");
        await expect(cards).toHaveCount(4);
        const rects = await cards.evaluateAll((nodes) =>
          nodes.map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          }),
        );
        const columns = new Set(rects.map((r) => Math.round(r.x)));
        const rows = new Set(rects.map((r) => Math.round(r.y)));
        expect(columns.size).toBe(2);
        expect(rows.size).toBe(2);
        for (const r of rects) expect(r.w).toBeCloseTo(rects[0].w, 0);
        const horizontalGap = rects[1].x - (rects[0].x + rects[0].w);
        const verticalGap = rects[2].y - (rects[0].y + rects[0].h);
        expect(horizontalGap).toBeCloseTo(verticalGap, 0);
        expect(horizontalGap).toBeGreaterThan(0);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(1);
      });
    }
  }

  for (const theme of THEMES) {
    test(`Project detail: tabs and table are separated by the section gap (${theme})`, async ({ page }) => {
      await setViewport(page, 1440, 900);
      await bootMetrio(page);
      await setTheme(page, theme);
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("metrio-open-project-cockpit", { detail: { projectKey: "UX" } }),
        );
      });
      const cockpit = page.getByTestId("project-cockpit");
      await expect(cockpit).toBeVisible();
      const tabs = cockpit.getByRole("group", { name: "Project work filter" });
      await expect(tabs).toBeVisible();
      const gap = await tabs.evaluate((el) => {
        const table = el.parentElement!.querySelector(".performance-table-wrap")!;
        return table.getBoundingClientRect().top - el.getBoundingClientRect().bottom;
      });
      // --space-3 (12px): two separate surfaces, no longer pressed together
      expect(gap).toBeGreaterThanOrEqual(11.5);
      expect(gap).toBeLessThanOrEqual(13);
    });
  }
});

import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootFeedbackDisconnected, bootMetrio, clickSubnav, setViewport } from "./visualBoot";

const THEMES = ["light", "dark"] as const;
const WIDTHS = [1280, 1440, 1728] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
}

test.describe("PASS 28 tooltip", () => {
  for (const theme of THEMES) {
    test(`no arrow, tight clear gap, never overlaps the icon (${theme})`, async ({ page }) => {
      await setViewport(page, 1440, 900);
      await bootMetrio(page);
      await setTheme(page, theme);
      const icon = page.locator(".help-icon").first();
      await icon.scrollIntoViewIfNeeded();
      await icon.hover();
      const tip = page.getByTestId("metrio-tooltip").first();
      await expect(tip).toBeVisible();
      await expect(tip.locator("svg")).toHaveCount(0);
      const pseudo = await tip.evaluate((el) => ({
        before: getComputedStyle(el, "::before").content,
        after: getComputedStyle(el, "::after").content,
      }));
      expect(pseudo.before === "none" || pseudo.before === "normal").toBe(true);
      expect(pseudo.after === "none" || pseudo.after === "normal").toBe(true);

      const a = (await icon.boundingBox())!;
      const b = (await tip.boundingBox())!;
      const verticalGap = b.y >= a.y + a.height ? b.y - (a.y + a.height) : a.y - (b.y + b.height);
      expect(verticalGap).toBeGreaterThanOrEqual(2);
      expect(verticalGap).toBeLessThanOrEqual(6);
      // still hoverable/clickable: the icon is not covered by the tooltip
      const covered = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.closest(".help-icon") == null,
        { x: a.x + a.width / 2, y: a.y + a.height / 2 },
      );
      expect(covered).toBe(false);
    });
  }

  test("collision handling keeps every tooltip inside the viewport (flips near edges)", async ({ page }) => {
    await setViewport(page, 1280, 520);
    await bootMetrio(page);
    const icons = page.locator(".help-icon");
    const count = Math.min(await icons.count(), 6);
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const icon = icons.nth(i);
      await icon.scrollIntoViewIfNeeded();
      const at = (await icon.boundingBox())!;
      await page.mouse.move(2, 2);
      await page.mouse.move(at.x + at.width / 2 - 6, at.y + at.height / 2 - 6);
      await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2, { steps: 4 });
      const tip = page.getByTestId("metrio-tooltip").first();
      await expect(tip).toBeVisible();
      const box = (await tip.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1280);
      expect(box.y + box.height).toBeLessThanOrEqual(520);
      // never overlaps the trigger
      const overlaps = !(box.x + box.width <= at.x || at.x + at.width <= box.x || box.y + box.height <= at.y || at.y + at.height <= box.y);
      expect(overlaps).toBe(false);
    }
  });
});

test.describe("PASS 28 feedback empty state", () => {
  for (const theme of THEMES) {
    test(`disconnected Google Forms: setup banner + a single New survey CTA (${theme})`, async ({ page }) => {
      await setViewport(page, 1440, 900);
      await bootFeedbackDisconnected(page, theme);
      await page.getByRole("button", { name: /^feedback$/i }).click();
      await expect(page.getByTestId("feedback-cycles-empty-hint")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("feedback-cycles-empty")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "New survey" })).toHaveCount(1);
    });
  }
});

test.describe("PASS 28 history reports", () => {
  for (const width of WIDTHS) {
    test(`Delete action fits, aligns right and confirms @ ${width}`, async ({ page }) => {
      await page.addInitScript((reports) => {
        localStorage.setItem("metrio-visual-report-history", JSON.stringify(reports));
      }, [
        { id: "r1", filename: "one.pdf", createdAt: "2026-10-07T09:00:00.000Z" },
        { id: "r2", filename: "two.pdf", createdAt: "2026-10-08T10:30:00.000Z" },
      ]);
      await setViewport(page, width, 900);
      await bootMetrio(page);
      await clickSubnav(page, /History reports/i);
      const view = page.getByTestId("history-reports-view");
      await expect(view).toBeVisible();
      const rows = view.locator("tbody tr");
      await expect(rows).toHaveCount(2);
      const del = rows.first().getByTestId("history-report-delete");
      await expect(del).toBeVisible();
      const wrap = view.locator(".performance-table-wrap").first();
      expect(await wrap.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await del.click();
      await expect(page.getByRole("dialog", { name: "Delete report?" })).toBeVisible();
      await page.getByTestId("history-report-delete-cancel").click();
      await expect(page.getByRole("dialog", { name: "Delete report?" })).toHaveCount(0);
      await expect(rows).toHaveCount(2);
      // actions are right-aligned inside the last column and keep one consistent height
      const boxes = await view.locator(".performance-table__action-group").evaluateAll((nodes) =>
        nodes.map((n) => n.getBoundingClientRect()),
      );
      const wrapBox = (await wrap.boundingBox())!;
      for (const box of boxes) expect(box.right).toBeLessThanOrEqual(wrapBox.x + wrapBox.width + 1);
      expect(boxes[0].height).toBeCloseTo(boxes[1].height, 0);
    });
  }
});

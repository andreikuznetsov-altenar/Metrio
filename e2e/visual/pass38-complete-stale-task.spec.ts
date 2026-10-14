import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, clickSubnav, setViewport } from "./visualBoot";

const KEY = "UX-5203";

async function openStaleTask(page: Page) {
  await clickSubnav(page, /delivery risk/i);
  const view = page.getByTestId("delivery-risk-view");
  await expect(view).toBeVisible({ timeout: 15_000 });
  const rows = view.locator("tbody tr");
  const before = await rows.count();
  await rows.filter({ hasText: KEY }).first().click();
  await expect(page.getByTestId("task-journey-drawer")).toBeVisible({ timeout: 10_000 });
  return before;
}

for (const theme of ["light", "dark"] as const) {
  test(`stale Review task: Mark complete action, upward menu, confirm, row disappears (${theme})`, async ({ page }) => {
    await setViewport(page, 1440, 820);
    await bootMetrio(page, "lead");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    const before = await openStaleTask(page);

    const drawer = page.locator(".task-journey-drawer");
    const open = drawer.getByRole("button", { name: "Open in Jira" });
    const complete = page.getByTestId("task-mark-complete");
    await expect(complete).toBeVisible();
    await expect(complete).toHaveClass(/btn--secondary/);
    const [ob, cb] = await Promise.all([open.boundingBox(), complete.boundingBox()]);
    expect(Math.abs(ob!.height - cb!.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(ob!.y - cb!.y)).toBeLessThanOrEqual(1);
    // plus icon sits to the right of the label, real svg, no chevron
    const iconBox = await complete.locator("svg").boundingBox();
    const labelBox = await complete.locator("span").boundingBox();
    expect(iconBox!.x).toBeGreaterThan(labelBox!.x + labelBox!.width - 1);
    expect(await complete.locator("svg.lucide-plus").count()).toBe(1);
    expect(await complete.locator('[class*="chevron"]').count()).toBe(0);

    await complete.click();
    const menu = page.getByTestId("task-completion-menu");
    await expect(menu).toBeVisible();
    const mb = (await menu.boundingBox())!;
    const cb2 = (await complete.boundingBox())!;
    expect(mb.y + mb.height).toBeLessThanOrEqual(cb2.y + 1); // opens ABOVE the button
    expect(mb.y).toBeGreaterThanOrEqual(0);
    await expect(menu).toHaveAttribute("data-side", "top");
    const items = page.getByTestId("task-completion-option");
    await expect(items).toHaveText(["Complete as Done"]); // Cancelled + required-field transitions excluded

    await items.first().click();
    const confirm = page.getByTestId("task-completion-confirm");
    await expect(confirm).toContainText(`${KEY} will be moved to Done in Jira.`);
    await page.getByTestId("task-completion-confirm-button").click();

    await expect(page.getByTestId("task-mark-complete")).toHaveCount(0);
    await expect(page.locator(".task-journey-drawer__header-badges")).toContainText("Done");
    await expect(drawer.getByRole("button", { name: "Open in Jira" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("task-journey-drawer")).toHaveCount(0, { timeout: 10_000 });
    const view = page.getByTestId("delivery-risk-view");
    await expect(view.locator("tbody tr").filter({ hasText: KEY })).toHaveCount(0);
    await expect(view.locator("tbody tr")).toHaveCount(before - 1);
  });
}

test("Jira failure keeps the task, status and risk row; Open in Jira remains", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("metrio-visual-completionFail", "1"));
  await setViewport(page, 1440, 820);
  await bootMetrio(page, "lead");
  const before = await openStaleTask(page);
  await page.getByTestId("task-mark-complete").click();
  await page.getByTestId("task-completion-option").first().click();
  await page.getByTestId("task-completion-confirm-button").click();
  await expect(page.getByTestId("task-completion-error")).toContainText("Couldn’t update Jira status");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".task-journey-drawer__header-badges")).toContainText("In Review");
  await expect(page.locator(".task-journey-drawer").getByRole("button", { name: "Open in Jira" })).toBeVisible();
  await expect(page.getByTestId("task-mark-complete")).toBeVisible();
  await page.keyboard.press("Escape");
  const view = page.getByTestId("delivery-risk-view");
  await expect(view.locator("tbody tr").filter({ hasText: KEY })).toHaveCount(1);
  await expect(view.locator("tbody tr")).toHaveCount(before);
});

test("non-stale or non-Review/Hold tasks never show the action", async ({ page }) => {
  await setViewport(page, 1440, 820);
  await bootMetrio(page, "lead");
  await clickSubnav(page, /delivery risk/i);
  const view = page.getByTestId("delivery-risk-view");
  await expect(view).toBeVisible({ timeout: 15_000 });
  const row = view.locator("tbody tr").filter({ hasText: "UX-2962" }).first();
  if (await row.count()) {
    await row.click();
    await expect(page.getByTestId("task-journey-drawer")).toBeVisible();
    await expect(page.getByTestId("task-mark-complete")).toHaveCount(0);
  }
});

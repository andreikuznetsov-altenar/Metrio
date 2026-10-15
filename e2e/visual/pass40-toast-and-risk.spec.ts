import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootMetrio, clickSubnav, openFirstAttentionPerson, setViewport } from "./visualBoot";

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

async function completeStaleTask(page: Page) {
  await page.getByTestId("task-mark-complete").click();
  await page.getByTestId("task-completion-option").first().click();
  await page.getByTestId("task-completion-confirm-button").click();
  await expect(page.locator(".metrio-toast-host .toast--success")).toBeVisible({ timeout: 10_000 });
}

/** What would receive a real pointer click at the centre of `locator`. */
async function topmostAtCentre(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { ok: hit === el || el.contains(hit), hit: hit ? `${hit.tagName}.${String((hit as HTMLElement).className).slice(0, 60)}` : null };
  }, selector);
}

for (const theme of ["light", "dark"] as const) {
  test(`Mark complete → toast → Close drawer immediately → Delivery Risk table already updated (${theme})`, async ({ page }) => {
    await setViewport(page, 1440, 820);
    await bootMetrio(page, "lead");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    const before = await openStaleTask(page);
    const countBefore = await page.getByTestId("delivery-risk-view").locator("tbody tr").count();
    expect(countBefore).toBe(before);

    await completeStaleTask(page);
    const toast = page.locator(".metrio-toast-host .toast--success");
    await expect(toast).toBeVisible();

    // The toast viewport must never be a pointer-intercepting layer; its card is clickable.
    const pe = await page.evaluate(() => {
      const host = document.querySelector(".metrio-toast-host") as HTMLElement;
      const card = host.querySelector(".toast") as HTMLElement;
      return { host: getComputedStyle(host).pointerEvents, card: getComputedStyle(card).pointerEvents };
    });
    expect(pe).toEqual({ host: "none", card: "auto" });

    // The drawer's Close button is hit-testable while the toast is visible.
    expect((await topmostAtCentre(page, ".task-journey-drawer [aria-label='Close drawer']")).ok).toBe(true);
    await page.locator(".task-journey-drawer").getByRole("button", { name: "Close drawer" }).click();
    await expect(page.getByTestId("task-journey-drawer")).toHaveCount(0, { timeout: 5_000 });
    await expect(toast).toBeVisible(); // the toast keeps its normal lifetime

    const view = page.getByTestId("delivery-risk-view");
    await expect(view).toBeVisible();
    await expect(view.locator("tbody tr").filter({ hasText: KEY })).toHaveCount(0);
    await expect(view.locator("tbody tr")).toHaveCount(before - 1);
  });
}

test("a visible toast never swallows clicks: page navigation behind its transparent area works", async ({ page }) => {
  await setViewport(page, 1440, 820);
  await bootMetrio(page, "lead");
  await openStaleTask(page);
  await completeStaleTask(page);
  await page.getByRole("button", { name: "Close drawer" }).first().click();
  await expect(page.getByTestId("task-journey-drawer")).toHaveCount(0);
  const toast = page.locator(".metrio-toast-host .toast--success");
  await expect(toast).toBeVisible();
  // A subnav tab is clickable while the toast is on screen.
  await page.locator(".performance-subnav").getByRole("button", { name: /^overview$/i }).click();
  await expect(page.locator(".performance-subnav").getByRole("button", { name: /^overview$/i })).toHaveClass(/is-active/);
  // Points around the toast (its transparent viewport region) hit the app, not the viewport.
  const around = await page.evaluate(() => {
    const host = document.querySelector(".metrio-toast-host") as HTMLElement;
    const r = host.getBoundingClientRect();
    const hits = [r.left + 4, r.right - 4].map((x) => document.elementFromPoint(x, r.top - 6));
    return hits.every((h) => h && !host.contains(h));
  });
  expect(around).toBe(true);
});

test("Person drawer closes while a toast is visible", async ({ page }) => {
  await setViewport(page, 1440, 820);
  await bootMetrio(page, "lead");
  // Raise a toast through the real provider (Mark complete) and, with it on screen, open + close a person drawer.
  await openStaleTask(page);
  await completeStaleTask(page);
  await page.getByRole("button", { name: "Close drawer" }).first().click();
  await expect(page.getByTestId("task-journey-drawer")).toHaveCount(0);
  await clickSubnav(page, /^overview$/i);
  await openFirstAttentionPerson(page);
  const drawer = page.getByTestId("person-detail-drawer");
  await expect(drawer).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".metrio-toast-host .toast--success")).toBeVisible();
  expect((await topmostAtCentre(page, "[data-testid='person-detail-drawer'] [aria-label='Close drawer']")).ok).toBe(true);
  await drawer.getByRole("button", { name: "Close drawer" }).first().click();
  await expect(page.getByTestId("person-detail-drawer")).toHaveCount(0, { timeout: 5_000 });
});

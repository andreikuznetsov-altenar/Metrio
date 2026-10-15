import { expect, type Page } from "@playwright/test";
import { test } from "./baseTest";
import { bootConnected, bootDashboardManager, expectPerformanceTab, setViewport } from "./visualBoot";

async function bootIc(page: Page, level: 0 | 1 | 2 | 3, theme: "light" | "dark", width: number) {
  await setViewport(page, width, 900);
  await page.addInitScript((n: number) => localStorage.setItem("metrio-visual-visualOwnStale", String(n)), level);
  await bootConnected(page, "employee", theme);
  await expect(page.getByTestId("dashboard-ready")).toBeVisible({ timeout: 30_000 });
}

/** Layout + surface contract shared by every Recommended actions state. */
async function expectActionSurface(page: Page, expectedRows: number) {
  const section = page.getByTestId("recommended-actions");
  await expect(section).toBeVisible({ timeout: 15_000 });
  await expect(section.getByRole("heading", { name: "Recommended actions" })).toBeVisible();
  const rows = section.locator(".recommended-action");
  await expect(rows).toHaveCount(expectedRows);
  const info = await page.evaluate(() => {
    const sec = document.querySelector("[data-testid='recommended-actions']") as HTMLElement;
    const list = sec.querySelector(".recommended-actions__list") as HTMLElement;
    const probe = document.createElement("div");
    probe.style.cssText = "border:1px solid var(--color-action-surface-border);background:var(--color-action-surface-bg);border-radius:var(--radius-card);position:fixed;left:-9999px";
    document.body.appendChild(probe);
    const pcs = getComputedStyle(probe);
    const expected = { border: pcs.borderTopColor, bg: pcs.backgroundColor, radius: pcs.borderTopLeftRadius };
    probe.remove();
    const rows = Array.from(sec.querySelectorAll<HTMLElement>(".recommended-action")).map((row) => {
      const r = row.getBoundingClientRect();
      const cs = getComputedStyle(row);
      const cta = row.querySelector("button")!.getBoundingClientRect();
      const text = row.querySelector(".recommended-action__text")!.getBoundingClientRect();
      return {
        l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height,
        border: cs.borderTopColor, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, borderWidth: cs.borderTopWidth,
        ctaR: cta.right, ctaMid: cta.top + cta.height / 2, mid: r.top + r.height / 2, ctaL: cta.left, textR: text.right,
      };
    });
    const kpi = document.querySelector("[data-testid='dashboard-kpi-strip']")?.getBoundingClientRect().top ?? null;
    return { expected, rows, list: list.getBoundingClientRect().width, sec: sec.getBoundingClientRect().top, kpi, overflow: document.documentElement.scrollWidth - window.innerWidth, carousel: sec.querySelectorAll("[class*='carousel']").length };
  });
  expect(info.overflow).toBeLessThanOrEqual(0);
  expect(info.carousel).toBe(0);
  for (const [i, row] of info.rows.entries()) {
    expect(row.border).toBe(info.expected.border); // thin BLUE action border token
    expect(row.bg).toBe(info.expected.bg); // very light blue surface token
    expect(row.radius).toBe(info.expected.radius);
    expect(row.borderWidth).toBe("1px");
    expect(row.shadow).toBe("none"); // flat, no drop shadow
    expect(Math.abs(row.r - row.l - info.list)).toBeLessThanOrEqual(1); // full available width
    expect(Math.abs(row.l - info.rows[0]!.l)).toBeLessThanOrEqual(1); // one column
    expect(row.ctaR).toBeLessThanOrEqual(row.r - 8); // CTA on the right, inside the row
    expect(row.ctaR).toBeGreaterThan(row.r - 40);
    expect(Math.abs(row.ctaMid - row.mid)).toBeLessThanOrEqual(2); // vertically centred
    expect(row.textR).toBeLessThanOrEqual(row.ctaL); // never overlaps the CTA
    expect(row.h).toBeLessThan(140); // compact
    if (i > 0) {
      expect(row.t).toBeGreaterThan(info.rows[i - 1]!.b); // vertical stack
      expect(Math.abs(row.t - info.rows[i - 1]!.b - 8)).toBeLessThanOrEqual(1); // canonical 8px gap
    }
  }
  if (info.kpi !== null) expect(info.sec).toBeLessThan(info.kpi); // high on the dashboard, before secondary analytics
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 1440, 1728]) {
    test(`Team Lead dashboard: prioritized vertical stack (${theme} ${width})`, async ({ page }) => {
      await bootDashboardManager(page, { theme, width });
      const section = page.getByTestId("recommended-actions");
      await expect(section).toBeVisible({ timeout: 15_000 });
      const count = await section.locator(".recommended-action").count();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(3);
      await expectActionSurface(page, count);
      // no second, differently styled recommendation surface for the same dashboard
      await expect(page.getByTestId("dashboard-recommendations")).toHaveCount(0);
    });

    test(`IC dashboard: 1 / 2 / 3 actions stack full-width (${theme} ${width})`, async ({ page }) => {
      await bootIc(page, 3, theme, width);
      await expectActionSurface(page, 3);
    });
  }
}

test("IC dashboard: one action is ONE full-width row (not a third-width card)", async ({ page }) => {
  await bootIc(page, 1, "light", 1440);
  await expectActionSurface(page, 1);
  await expect(page.getByTestId("recommended-action-stale-review")).toContainText("2 tasks have been in Review for more than 30 days");
});

test("IC dashboard: two actions (stale Review + stale Hold)", async ({ page }) => {
  await bootIc(page, 2, "light", 1440);
  await expectActionSurface(page, 2);
});

test("IC dashboard with nothing to fix: the whole section is absent (no empty heading, no gap)", async ({ page }) => {
  await bootIc(page, 0, "light", 1440);
  await expect(page.getByTestId("dashboard-kpi-strip")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("recommended-actions")).toHaveCount(0);
  await expect(page.getByText("Recommended actions")).toHaveCount(0);
});

test("IC: Review tasks lands on the exact stale tasks (task list modal) and stays a live view", async ({ page }) => {
  await bootIc(page, 2, "light", 1440);
  await page.getByTestId("recommended-action-cta-stale-review").click();
  const modal = page.getByTestId("task-list-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("UX-4101");
  await expect(modal).toContainText("UX-4102");
  await expect(modal).not.toContainText("UX-4103"); // the hold task belongs to the other action
  await expect(modal).not.toContainText("UX-401"); // not stale
});

test("IC: Review tasks for held work and View work reach their surfaces", async ({ page }) => {
  await bootIc(page, 3, "light", 1440);
  await page.getByTestId("recommended-action-cta-stale-hold").click();
  await expect(page.getByTestId("task-list-modal")).toContainText("UX-4103");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("task-list-modal")).toHaveCount(0);
  await page.getByTestId("recommended-action-cta-high-workload").click();
  await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({ timeout: 30_000 });
});

test("Team Lead: Open Delivery Risk lands on Delivery Risk; Open Team Workload lands on the Performance overview", async ({ page }) => {
  await bootDashboardManager(page, { theme: "light", width: 1440 });
  const section = page.getByTestId("recommended-actions");
  await expect(section).toBeVisible({ timeout: 15_000 });
  await section.getByRole("button", { name: /^Open Delivery Risk/ }).first().click();
  await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({ timeout: 30_000 });
  await expectPerformanceTab(page, /^delivery risk$/i);

  await page.locator(".app-header__nav-link").filter({ hasText: "Dashboard" }).click();
  await expect(page.getByTestId("recommended-actions")).toBeVisible({ timeout: 15_000 });
  const workload = page.getByTestId("recommended-actions").getByRole("button", { name: /^Open Team Workload/ });
  if ((await workload.count()) > 0) {
    await workload.first().click();
    await expect(page.getByTestId("performance-dashboard-ready")).toBeVisible({ timeout: 30_000 });
    await expectPerformanceTab(page, /^overview$/i);
  }
});

test("keyboard: CTAs are reachable by Tab and the row itself is not a click target", async ({ page }) => {
  await bootIc(page, 1, "light", 1440);
  const cta = page.getByTestId("recommended-action-cta-stale-review");
  await cta.focus();
  await expect(cta).toBeFocused();
  await expect(cta).toHaveAccessibleName(/Review tasks: Review tasks are getting stale/);
  // clicking the row text (not the button) does nothing
  await page.getByTestId("recommended-action-stale-review").locator(".recommended-action__title").click();
  await expect(page.getByTestId("task-list-modal")).toHaveCount(0);
});
